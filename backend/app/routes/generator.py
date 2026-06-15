"""
Legal document generation routes.

Provides the generator endpoints with frontend-compatible URL patterns.
The frontend uses /generator/documents/* while the backend originally used /generator/generated/*.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.generator import (
    DocumentGenerationRequest,
    DocumentGenerationResponse,
    DocumentGenerationListResponse,
    DocumentTemplate,
)
from app.services.document_generator import DocumentGeneratorService

router = APIRouter(prefix="/generator", tags=["Document Generator"])


# ─── Response helpers ─────────────────────────────────────────────────────────

def _gen_doc_to_frontend(doc) -> dict:
    """Convert GeneratedDocument ORM → frontend GeneratedDocument shape."""
    doc_type = doc.doc_type.value if hasattr(doc.doc_type, "value") else str(doc.doc_type)
    gen_status = doc.status.value if hasattr(doc.status, "value") else str(doc.status)

    status_map = {"pending": "generating", "processing": "generating",
                  "completed": "complete", "failed": "error"}
    fe_status = status_map.get(gen_status, "generating")

    metadata = getattr(doc, "metadata", None) or {}
    completed_at = None
    if fe_status == "complete":
        completed_at = doc.updated_at.isoformat()

    return {
        "id": str(doc.id),
        "template": doc_type,
        "name": doc.title,
        "status": fe_status,
        "download_url": f"/api/v1/generator/documents/{doc.id}/download/" if fe_status == "complete" else None,
        "preview_url": f"/api/v1/generator/documents/{doc.id}/preview/" if fe_status == "complete" else None,
        "created_at": doc.created_at.isoformat(),
        "completed_at": completed_at,
        "word_count": metadata.get("word_count"),
        "page_count": metadata.get("page_count"),
    }


def _paginated(results: list, total: int, page: int, page_size: int) -> dict:
    has_next = (page * page_size) < total
    return {
        "count": total,
        "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
        "previous": f"?page={page - 1}&page_size={page_size}" if page > 1 else None,
        "results": results,
    }


# ─── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[DocumentTemplate])
async def get_templates(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    is_premium: Optional[bool] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
):
    gen_service = DocumentGeneratorService(db=None)
    templates = gen_service.get_available_templates()
    return templates


@router.get("/templates/", include_in_schema=False)
async def get_templates_slash(current_user: User = Depends(get_current_active_user)):
    return await get_templates(None, None, None, current_user)


@router.get("/templates/categories")
async def get_template_categories(current_user: User = Depends(get_current_active_user)):
    return [
        {"id": "corporate", "name": "Corporate", "description": "Company agreements and structures", "count": 4, "icon": "building"},
        {"id": "hr", "name": "HR & Employment", "description": "Employment contracts and policies", "count": 3, "icon": "users"},
        {"id": "contracts", "name": "Commercial Contracts", "description": "Service and vendor agreements", "count": 4, "icon": "file-text"},
        {"id": "ip", "name": "IP & Confidentiality", "description": "NDA and IP protection documents", "count": 2, "icon": "lock"},
        {"id": "financial", "name": "Financial", "description": "Loan, lease and financial agreements", "count": 3, "icon": "dollar-sign"},
        {"id": "compliance", "name": "Compliance", "description": "Privacy policy and terms of service", "count": 2, "icon": "shield"},
    ]


@router.get("/templates/categories/", include_in_schema=False)
async def get_template_categories_slash(current_user: User = Depends(get_current_active_user)):
    return await get_template_categories(current_user)


@router.get("/templates/{template_id}")
async def get_template_by_id(
    template_id: str,
    current_user: User = Depends(get_current_active_user),
):
    gen_service = DocumentGeneratorService(db=None)
    all_templates = gen_service.get_available_templates()
    for t in all_templates:
        if t.template_id == template_id:
            return t
    raise HTTPException(status_code=404, detail="Template not found.")


@router.get("/templates/{template_id}/", include_in_schema=False)
async def get_template_by_id_slash(
    template_id: str,
    current_user: User = Depends(get_current_active_user),
):
    return await get_template_by_id(template_id, current_user)


# ─── Generate ─────────────────────────────────────────────────────────────────

class FrontendGeneratePayload(BaseModel):
    """Frontend sends {template, fields, jurisdiction, output_format, custom_clauses}."""
    template: str
    fields: dict = {}
    jurisdiction: Optional[str] = "India"
    output_format: Optional[str] = "docx"
    custom_clauses: Optional[List[dict]] = None


async def _do_generate(payload: Any, llm_provider: Optional[str],
                       current_user: User, db: AsyncSession) -> dict:
    """Run generation and return frontend-compatible shape."""
    from app.models.generated_document import GeneratedDocType
    gen_service = DocumentGeneratorService(db)

    if isinstance(payload, FrontendGeneratePayload):
        try:
            doc_type = GeneratedDocType(payload.template)
        except ValueError:
            doc_type = GeneratedDocType.OTHER

        fields = payload.fields or {}
        parties_raw = fields.get("parties") or []
        from app.schemas.generator import PartyDetails
        parties = []
        for p in parties_raw:
            if isinstance(p, dict):
                parties.append(PartyDetails(
                    name=p.get("name", ""),
                    role=p.get("role", "party"),
                    address=p.get("address"),
                    entity_type=p.get("entity_type"),
                ))

        request = DocumentGenerationRequest(
            doc_type=doc_type,
            title=fields.get("title") or f"Generated {payload.template.replace('_', ' ').title()}",
            jurisdiction=payload.jurisdiction or "India",
            parties=parties,
            company_name=fields.get("company_name"),
            purpose=fields.get("purpose"),
            term=fields.get("term"),
            start_date=fields.get("start_date"),
            end_date=fields.get("end_date"),
            payment_amount=fields.get("payment_amount"),
            special_conditions=fields.get("special_conditions") or [],
            additional_context=str(fields) if fields else None,
        )
    else:
        request = payload

    doc = await gen_service.generate_document(
        request=request, user=current_user, llm_provider=llm_provider
    )

    return _gen_doc_to_frontend(doc)


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_document(
    request: DocumentGenerationRequest,
    llm_provider: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_generate(request, llm_provider, current_user, db)


@router.post("/generate/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def generate_document_frontend(
    payload: FrontendGeneratePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_generate(payload, None, current_user, db)


# ─── Field validation ─────────────────────────────────────────────────────────

class ValidatePayload(BaseModel):
    template: str
    fields: dict = {}


@router.post("/validate")
async def validate_fields(
    payload: ValidatePayload,
    current_user: User = Depends(get_current_active_user),
):
    return {"valid": True, "errors": [], "warnings": []}


@router.post("/validate/")
async def validate_fields_slash(
    payload: ValidatePayload,
    current_user: User = Depends(get_current_active_user),
):
    return {"valid": True, "errors": [], "warnings": []}


# ─── Generated documents — /generator/documents/* (frontend URLs) ─────────────

@router.get("/documents")
async def list_generated_documents_frontend(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    template: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    skip = (page - 1) * page_size
    count_result = await db.execute(
        select(func.count()).where(GeneratedDocument.user_id == current_user.id)
    )
    total = count_result.scalar_one()
    result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.user_id == current_user.id)
        .offset(skip).limit(page_size)
        .order_by(GeneratedDocument.created_at.desc())
    )
    documents = list(result.scalars().all())
    results = [_gen_doc_to_frontend(d) for d in documents]
    return _paginated(results, total, page, page_size)


@router.get("/documents/", include_in_schema=False)
async def list_generated_documents_frontend_slash(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_generated_documents_frontend(page, page_size, None, None, None, current_user, db)


@router.get("/documents/{document_id}")
async def get_generated_document_frontend(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _gen_doc_to_frontend(doc)


@router.get("/documents/{document_id}/", include_in_schema=False)
async def get_generated_document_frontend_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_generated_document_frontend(document_id, current_user, db)


@router.get("/documents/{document_id}/status")
async def get_generation_status(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_generated_document_frontend(document_id, current_user, db)
    return {
        "status": doc["status"],
        "progress": 100 if doc["status"] == "complete" else 50,
        "message": "Generation complete." if doc["status"] == "complete" else "Generating...",
        "estimated_seconds_remaining": None,
    }


@router.get("/documents/{document_id}/status/", include_in_schema=False)
async def get_generation_status_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_generation_status(document_id, current_user, db)


@router.get("/documents/{document_id}/preview")
async def get_document_preview_url(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_generated_document_frontend(document_id, current_user, db)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    return {
        "preview_url": doc.get("preview_url") or f"/api/v1/generator/documents/{document_id}/download/",
        "expires_at": expires,
    }


@router.get("/documents/{document_id}/preview/", include_in_schema=False)
async def get_document_preview_url_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_document_preview_url(document_id, current_user, db)


@router.get("/documents/{document_id}/download")
async def get_generated_document_url(
    document_id: uuid.UUID,
    format: str = Query(default="docx"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    if doc.file_path:
        return {
            "url": f"/api/v1/generator/documents/{document_id}/file/",
            "expires_at": expires,
            "filename": f"{doc.title}.{format}",
        }

    # If no file path, return document content as download
    content_bytes = (doc.content or "").encode("utf-8")
    return Response(
        content=content_bytes,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{doc.title}.txt"'},
    )


@router.get("/documents/{document_id}/download/", include_in_schema=False)
async def get_generated_document_url_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_generated_document_url(document_id, "docx", current_user, db)


@router.delete("/documents/{document_id}", status_code=status.HTTP_200_OK)
async def delete_generated_document_frontend(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted."}


@router.delete("/documents/{document_id}/", status_code=status.HTTP_200_OK, include_in_schema=False)
async def delete_generated_document_frontend_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await delete_generated_document_frontend(document_id, current_user, db)


class RegeneratePayload(BaseModel):
    fields: dict = {}


@router.post("/documents/{document_id}/regenerate")
async def regenerate_document(
    document_id: uuid.UUID,
    payload: RegeneratePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_generated_document_frontend(document_id, current_user, db)
    return doc


@router.post("/documents/{document_id}/regenerate/", include_in_schema=False)
async def regenerate_document_slash(
    document_id: uuid.UUID,
    payload: RegeneratePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await regenerate_document(document_id, payload, current_user, db)


@router.post("/documents/{document_id}/save-to-library")
async def save_to_library(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return {"document_id": str(document_id)}


@router.post("/documents/{document_id}/save-to-library/", include_in_schema=False)
async def save_to_library_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await save_to_library(document_id, current_user, db)


class CustomizeSectionPayload(BaseModel):
    section: str
    instruction: str


@router.post("/documents/{document_id}/customize-section")
async def customize_section(
    document_id: uuid.UUID,
    payload: CustomizeSectionPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "section": payload.section,
        "original_text": "",
        "customized_text": f"Customized version of {payload.section} based on: {payload.instruction}",
    }


@router.post("/documents/{document_id}/customize-section/", include_in_schema=False)
async def customize_section_slash(
    document_id: uuid.UUID,
    payload: CustomizeSectionPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await customize_section(document_id, payload, current_user, db)


class ApplyCustomizationPayload(BaseModel):
    section: str
    customized_text: str


@router.post("/documents/{document_id}/apply-customization")
async def apply_customization(
    document_id: uuid.UUID,
    payload: ApplyCustomizationPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_generated_document_frontend(document_id, current_user, db)


@router.post("/documents/{document_id}/apply-customization/", include_in_schema=False)
async def apply_customization_slash(
    document_id: uuid.UUID,
    payload: ApplyCustomizationPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await apply_customization(document_id, payload, current_user, db)


@router.get("/documents/{document_id}/suggestions")
async def get_document_suggestions(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "suggestions": [
            {
                "section": "Limitation of Liability",
                "type": "add_clause",
                "description": "Add a limitation of liability clause",
                "reason": "This protects both parties from unlimited exposure",
            },
            {
                "section": "Force Majeure",
                "type": "add_clause",
                "description": "Add force majeure provisions",
                "reason": "Required under Indian Contract Act for unforeseen circumstances",
            },
        ]
    }


@router.get("/documents/{document_id}/suggestions/", include_in_schema=False)
async def get_document_suggestions_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_document_suggestions(document_id, current_user, db)


# ─── Original /generator/generated/* routes (kept for backward compat) ────────

@router.get("/generated", response_model=DocumentGenerationListResponse)
async def list_generated_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    skip = (page - 1) * page_size
    count_result = await db.execute(
        select(func.count()).where(GeneratedDocument.user_id == current_user.id)
    )
    total = count_result.scalar_one()
    result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.user_id == current_user.id)
        .offset(skip).limit(page_size)
        .order_by(GeneratedDocument.created_at.desc())
    )
    documents = list(result.scalars().all())
    return DocumentGenerationListResponse(
        documents=[DocumentGenerationResponse.model_validate(doc) for doc in documents],
        total=total, page=page, page_size=page_size,
    )


@router.get("/generated/{document_id}", response_model=DocumentGenerationResponse)
async def get_generated_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Generated document not found.")
    return DocumentGenerationResponse.model_validate(doc)


@router.delete("/generated/{document_id}", status_code=status.HTTP_200_OK)
async def delete_generated_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.generated_document import GeneratedDocument
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Generated document not found.")
    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully."}
