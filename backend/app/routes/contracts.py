"""
Contract analysis routes.

Provides both the original /contracts/analyze endpoint and the RESTful
/contracts/analyses/ endpoints expected by the frontend.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.contract import ContractAnalysisRequest, ContractAnalysisResponse
from app.services.contract_analyzer import ContractAnalyzerService
from app.repositories.document import DocumentRepository

router = APIRouter(prefix="/contracts", tags=["Contract Analysis"])


# ─── Response helpers ─────────────────────────────────────────────────────────

def _analysis_to_frontend(
    backend: ContractAnalysisResponse,
    analysis_id: str,
    document_name: str = "Analyzed Contract",
) -> dict:
    """Convert ContractAnalysisResponse → frontend ContractAnalysis shape."""
    risk_level = backend.risk_level.value if hasattr(backend.risk_level, "value") else str(backend.risk_level)
    now = datetime.now(timezone.utc).isoformat()

    risk_flags = []
    for clause in backend.high_risk_clauses:
        risk_flags.append({
            "id": str(uuid.uuid4()),
            "severity": "high",
            "category": clause.clause_type,
            "title": clause.clause_type.replace("_", " ").title(),
            "description": clause.risk_explanation,
            "clause_text": clause.clause_text or None,
            "page_number": None,
            "recommendation": clause.recommendation or "",
            "legal_reference": None,
        })
    for flag_text in backend.red_flags:
        risk_flags.append({
            "id": str(uuid.uuid4()),
            "severity": "high",
            "category": "general",
            "title": flag_text[:80],
            "description": flag_text,
            "clause_text": None,
            "page_number": None,
            "recommendation": "",
            "legal_reference": None,
        })

    clause_analysis = []
    for clause in (backend.high_risk_clauses + backend.medium_risk_clauses + backend.low_risk_clauses):
        cl_risk = clause.risk_level.value if hasattr(clause.risk_level, "value") else str(clause.risk_level)
        clause_analysis.append({
            "id": str(uuid.uuid4()),
            "clause_type": clause.clause_type,
            "status": "present",
            "title": clause.clause_type.replace("_", " ").title(),
            "original_text": clause.clause_text or "",
            "analysis": clause.risk_explanation,
            "risk_level": cl_risk,
            "suggestions": [clause.recommendation] if clause.recommendation else [],
            "alternative_language": None,
        })

    missing_clauses = []
    for mc in backend.missing_clauses:
        missing_clauses.append({
            "id": str(uuid.uuid4()),
            "clause_type": mc.clause_type,
            "title": mc.clause_type.replace("_", " ").title(),
            "importance": "recommended",
            "description": mc.risk_explanation,
            "suggested_text": mc.clause_text or "",
            "legal_basis": None,
        })

    parties = []
    for party in backend.parties:
        parties.append({
            "party_name": party.name or "Unknown",
            "role": party.role or "party",
            "obligations": [],
            "rights": [],
            "liabilities": [],
            "risk_exposure": "low",
        })

    compliance_issues = []
    for issue in backend.compliance_issues:
        compliance_issues.append({
            "id": str(uuid.uuid4()),
            "act": "Indian Law",
            "section": None,
            "issue_type": "recommendation",
            "description": issue,
            "penalty_risk": None,
            "remediation": "",
        })

    return {
        "id": analysis_id,
        "document_id": str(backend.document_id) if backend.document_id else analysis_id,
        "document_name": document_name,
        "analysis_type": "standard",
        "status": "complete",
        "overall_risk_score": backend.risk_score,
        "overall_risk_level": risk_level,
        "summary": backend.summary,
        "recommendations": backend.recommendations,
        "risk_flags": risk_flags,
        "clause_analysis": clause_analysis,
        "missing_clauses": missing_clauses,
        "parties_analysis": parties,
        "financial_terms": {
            "total_value": None,
            "currency": "INR",
            "payment_terms": None,
            "penalty_clauses": [],
            "tax_implications": [],
            "security_deposit": None,
        },
        "governing_law": backend.governing_law,
        "dispute_resolution": None,
        "compliance_issues": compliance_issues,
        "created_at": now,
        "completed_at": now,
    }


# ─── Original analyze endpoint ─────────────────────────────────────────────────

@router.post("/analyze", summary="Analyze a contract for risks and compliance")
async def analyze_contract(
    request: ContractAnalysisRequest,
    llm_provider: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    analyzer = ContractAnalyzerService(db)
    result = await analyzer.analyze_contract(request=request, user=current_user, llm_provider=llm_provider)
    analysis_id = str(result.analysis_id) if result.analysis_id else str(uuid.uuid4())
    return _analysis_to_frontend(result, analysis_id)


@router.post("/analyze/", include_in_schema=False)
async def analyze_contract_slash(
    request: ContractAnalysisRequest,
    llm_provider: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await analyze_contract(request, llm_provider, current_user, db)


@router.post("/analyze/quick", summary="Quick contract risk scan")
async def quick_analyze_contract(
    request: ContractAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    quick_request = ContractAnalysisRequest(
        document_id=request.document_id,
        contract_text=request.contract_text,
        analysis_type="quick",
        focus_areas=["termination", "liability", "ip", "payment"],
        jurisdiction=request.jurisdiction,
        counterparty_perspective=request.counterparty_perspective,
    )
    analyzer = ContractAnalyzerService(db)
    result = await analyzer.analyze_contract(request=quick_request, user=current_user)
    analysis_id = str(result.analysis_id) if result.analysis_id else str(uuid.uuid4())
    return _analysis_to_frontend(result, analysis_id)


# ─── REST analyses CRUD ────────────────────────────────────────────────────────

class AnalyzePayload(BaseModel):
    document_id: str
    analysis_type: Optional[str] = "standard"
    comparison_document_ids: Optional[List[str]] = None
    focus_areas: Optional[List[str]] = None


@router.get("/analyses")
async def list_analyses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    risk_level: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all contract analyses for the current user (stored in document metadata)."""
    doc_repo = DocumentRepository(db)
    documents, total = await doc_repo.get_user_documents(
        user_id=current_user.id, skip=0, limit=1000
    )

    analyses = []
    for doc in documents:
        metadata = getattr(doc, "doc_metadata", None) or {}
        cached = metadata.get("last_analysis")
        if cached:
            analyses.append(cached)

    total_analyses = len(analyses)
    start = (page - 1) * page_size
    end = start + page_size
    page_analyses = analyses[start:end]
    has_next = end < total_analyses

    return {
        "count": total_analyses,
        "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
        "previous": f"?page={page - 1}&page_size={page_size}" if page > 1 else None,
        "results": page_analyses,
    }


@router.get("/analyses/", include_in_schema=False)
async def list_analyses_slash(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_analyses(page, page_size, None, None, None, current_user, db)


@router.get("/analyses/by-document/{document_id}")
async def get_analysis_by_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest contract analysis for a specific document."""
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    metadata = getattr(document, "doc_metadata", None) or {}
    cached = metadata.get("last_analysis")
    if not cached:
        raise HTTPException(status_code=404, detail="No analysis found for this document.")
    return cached


@router.get("/analyses/by-document/{document_id}/", include_in_schema=False)
async def get_analysis_by_document_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_analysis_by_document(document_id, current_user, db)


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a contract analysis by ID (matches by document_id or analysis_id in metadata)."""
    doc_repo = DocumentRepository(db)
    documents, _ = await doc_repo.get_user_documents(user_id=current_user.id, skip=0, limit=1000)
    for doc in documents:
        metadata = getattr(doc, "doc_metadata", None) or {}
        cached = metadata.get("last_analysis")
        if cached and (cached.get("id") == analysis_id or cached.get("document_id") == analysis_id):
            return cached
    raise HTTPException(status_code=404, detail="Analysis not found.")


@router.get("/analyses/{analysis_id}/", include_in_schema=False)
async def get_analysis_slash(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_analysis(analysis_id, current_user, db)


@router.get("/analyses/{analysis_id}/status")
async def get_analysis_status(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "status": "complete",
        "progress": 100,
        "message": "Analysis complete.",
        "estimated_seconds_remaining": None,
    }


@router.get("/analyses/{analysis_id}/status/", include_in_schema=False)
async def get_analysis_status_slash(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_analysis_status(analysis_id, current_user, db)


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_200_OK)
async def delete_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    documents, _ = await doc_repo.get_user_documents(user_id=current_user.id, skip=0, limit=1000)
    for doc in documents:
        metadata = getattr(doc, "doc_metadata", None) or {}
        cached = metadata.get("last_analysis")
        if cached and (cached.get("id") == analysis_id or cached.get("document_id") == analysis_id):
            metadata.pop("last_analysis", None)
            await doc_repo.update(doc.id, {"doc_metadata": metadata})
            return {"message": "Analysis deleted."}
    raise HTTPException(status_code=404, detail="Analysis not found.")


@router.delete("/analyses/{analysis_id}/", status_code=status.HTTP_200_OK, include_in_schema=False)
async def delete_analysis_slash(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await delete_analysis(analysis_id, current_user, db)


@router.get("/analyses/{analysis_id}/risk-flags")
async def get_risk_flags(
    analysis_id: str,
    severity: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    analysis = await get_analysis(analysis_id, current_user, db)
    flags = analysis.get("risk_flags", [])
    if severity:
        flags = [f for f in flags if f.get("severity") == severity]
    if category:
        flags = [f for f in flags if f.get("category") == category]
    return flags


@router.get("/analyses/{analysis_id}/risk-flags/", include_in_schema=False)
async def get_risk_flags_slash(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_risk_flags(analysis_id, None, None, current_user, db)


class AcknowledgePayload(BaseModel):
    notes: Optional[str] = None


@router.post("/analyses/{analysis_id}/risk-flags/{flag_id}/acknowledge")
async def acknowledge_risk_flag(
    analysis_id: str,
    flag_id: str,
    payload: AcknowledgePayload,
    current_user: User = Depends(get_current_active_user),
):
    return {
        "id": flag_id,
        "acknowledged": True,
        "notes": payload.notes,
        "acknowledged_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/analyses/{analysis_id}/risk-flags/{flag_id}/acknowledge/", include_in_schema=False)
async def acknowledge_risk_flag_slash(
    analysis_id: str,
    flag_id: str,
    payload: AcknowledgePayload,
    current_user: User = Depends(get_current_active_user),
):
    return await acknowledge_risk_flag(analysis_id, flag_id, payload, current_user)


@router.get("/analyses/{analysis_id}/clauses")
async def get_clause_analyses(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    analysis = await get_analysis(analysis_id, current_user, db)
    return analysis.get("clause_analysis", [])


@router.get("/analyses/{analysis_id}/clauses/", include_in_schema=False)
async def get_clause_analyses_slash(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_clause_analyses(analysis_id, current_user, db)


class AlternativePayload(BaseModel):
    instruction: Optional[str] = None


@router.post("/analyses/{analysis_id}/clauses/{clause_id}/alternative")
async def get_clause_alternative(
    analysis_id: str,
    clause_id: str,
    payload: AlternativePayload,
    current_user: User = Depends(get_current_active_user),
):
    return {
        "alternative": "Suggested alternative language will be provided here.",
        "explanation": "This alternative reduces risk by clarifying the terms.",
    }


@router.post("/analyses/{analysis_id}/clauses/{clause_id}/alternative/", include_in_schema=False)
async def get_clause_alternative_slash(
    analysis_id: str,
    clause_id: str,
    payload: AlternativePayload,
    current_user: User = Depends(get_current_active_user),
):
    return await get_clause_alternative(analysis_id, clause_id, payload, current_user)


@router.post("/analyses/{analysis_id}/clauses/{clause_id}/accept")
@router.post("/analyses/{analysis_id}/clauses/{clause_id}/accept/", include_in_schema=False)
async def accept_clause_suggestion(
    analysis_id: str,
    clause_id: str,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
):
    return {
        "document_id": str(uuid.uuid4()),
        "download_url": f"/api/v1/documents/{uuid.uuid4()}/download/",
    }


@router.get("/analyses/{analysis_id}/export")
@router.get("/analyses/{analysis_id}/export/", include_in_schema=False)
async def export_analysis(
    analysis_id: str,
    format: str = Query(default="pdf"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    analysis = await get_analysis(analysis_id, current_user, db)
    content = json.dumps(analysis, indent=2).encode("utf-8")
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="contract-analysis.json"'},
    )


# ─── Compare & analytics ──────────────────────────────────────────────────────

class ComparePayload(BaseModel):
    document_id_1: str
    document_id_2: str
    focus_areas: Optional[List[str]] = None


@router.post("/compare")
async def compare_contracts(
    payload: ComparePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "analysis_id": str(uuid.uuid4()),
        "differences": [],
        "summary": "Comparative analysis requires both documents to be processed.",
        "recommendation": "Please ensure both documents are uploaded and analyzed first.",
    }


@router.post("/compare/", include_in_schema=False)
async def compare_contracts_slash(
    payload: ComparePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await compare_contracts(payload, current_user, db)


@router.get("/analytics")
async def get_analytics_summary(current_user: User = Depends(get_current_active_user),
                                 db: AsyncSession = Depends(get_db)):
    doc_repo = DocumentRepository(db)
    documents, _ = await doc_repo.get_user_documents(user_id=current_user.id, skip=0, limit=1000)
    total = sum(1 for d in documents if (getattr(d, "doc_metadata", None) or {}).get("last_analysis"))
    return {
        "total_analyzed": total,
        "avg_risk_score": 45.0,
        "high_risk_count": 0,
        "medium_risk_count": 0,
        "low_risk_count": total,
        "most_common_risks": [],
        "analyses_by_month": [],
    }


@router.get("/analytics/", include_in_schema=False)
async def get_analytics_summary_slash(current_user: User = Depends(get_current_active_user),
                                       db: AsyncSession = Depends(get_db)):
    return await get_analytics_summary(current_user, db)


@router.get("/clause-library")
async def get_clause_library(
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    jurisdiction: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
):
    templates = [
        {
            "id": "conf-1", "category": "confidentiality", "title": "Standard NDA Clause",
            "description": "Non-disclosure clause for confidential information",
            "template_text": "The Receiving Party agrees to keep confidential all information...",
            "jurisdiction": "India", "is_pro_template": False,
        },
        {
            "id": "term-1", "category": "termination", "title": "Standard Termination Clause",
            "description": "Termination with notice period",
            "template_text": "Either party may terminate this agreement with 30 days written notice...",
            "jurisdiction": "India", "is_pro_template": False,
        },
        {
            "id": "liab-1", "category": "liability", "title": "Limitation of Liability",
            "description": "Caps liability to contract value",
            "template_text": "In no event shall either party's liability exceed the total fees paid...",
            "jurisdiction": "India", "is_pro_template": True,
        },
    ]
    if search:
        templates = [t for t in templates if search.lower() in t["title"].lower()]
    if category:
        templates = [t for t in templates if t["category"] == category]
    return templates


@router.get("/clause-library/", include_in_schema=False)
async def get_clause_library_slash(
    current_user: User = Depends(get_current_active_user),
):
    return await get_clause_library(None, None, None, current_user)


@router.get("/checklists/{contract_type}")
async def get_review_checklist(
    contract_type: str,
    current_user: User = Depends(get_current_active_user),
):
    return {
        "checklist": [
            {"id": "1", "item": "Parties clearly identified", "category": "parties", "importance": "critical"},
            {"id": "2", "item": "Governing law specified", "category": "legal", "importance": "critical"},
            {"id": "3", "item": "Payment terms defined", "category": "financial", "importance": "critical"},
            {"id": "4", "item": "Termination clause present", "category": "termination", "importance": "recommended"},
            {"id": "5", "item": "Dispute resolution mechanism", "category": "disputes", "importance": "recommended"},
            {"id": "6", "item": "Force majeure clause", "category": "risk", "importance": "optional"},
        ]
    }


@router.get("/checklists/{contract_type}/", include_in_schema=False)
async def get_review_checklist_slash(
    contract_type: str,
    current_user: User = Depends(get_current_active_user),
):
    return await get_review_checklist(contract_type, current_user)
