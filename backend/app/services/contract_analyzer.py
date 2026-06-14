"""
Contract analyzer service using RAG + LLM for comprehensive Indian law contract analysis.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

import structlog
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.repositories.document import DocumentRepository
from app.schemas.contract import (
    ContractAnalysisRequest,
    ContractAnalysisResponse,
    ClauseAnalysis,
    PartyInfo,
)
from app.services.llm import LLMService, LAWBOT_CONTRACT_ANALYSIS_PROMPT, get_llm_service
from app.services.rag import RAGService

logger = structlog.get_logger(__name__)

# Contract analysis query templates
CONTRACT_ANALYSIS_QUERIES = [
    "parties to the contract and their obligations",
    "payment terms milestones penalty interest",
    "termination notice period for cause convenience",
    "intellectual property ownership assignment license",
    "liability limitation indemnification",
    "confidentiality non-disclosure period",
    "dispute resolution arbitration governing law jurisdiction",
    "warranties representations covenants",
    "force majeure events",
    "governing law applicable regulations India",
]

STANDARD_CLAUSES_CHECKLIST = [
    "Parties and recitals",
    "Definitions",
    "Scope of work/services",
    "Payment terms",
    "Term and renewal",
    "Termination rights",
    "Intellectual property",
    "Confidentiality",
    "Representations and warranties",
    "Limitation of liability",
    "Indemnification",
    "Dispute resolution",
    "Governing law and jurisdiction",
    "Force majeure",
    "Notice clause",
    "Amendment clause",
    "Entire agreement clause",
]


class ContractAnalyzerService:
    """
    Service for comprehensive contract analysis under Indian law.
    Uses RAG to retrieve relevant contract sections and LLM for analysis.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.doc_repo = DocumentRepository(db)
        self.rag = RAGService()

    async def analyze_contract(
        self,
        request: ContractAnalysisRequest,
        user: User,
        llm_provider: Optional[str] = None,
    ) -> ContractAnalysisResponse:
        """
        Perform comprehensive contract analysis.

        Args:
            request: Contract analysis request
            user: Authenticated user
            llm_provider: Optional LLM provider override

        Returns:
            Detailed ContractAnalysisResponse
        """
        # Determine contract text source
        contract_text = ""
        document_id = None

        if request.document_id:
            # Retrieve from uploaded document
            doc = await self.doc_repo.get_by_id_and_user(request.document_id, user.id)
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found or access denied.",
                )
            document_id = request.document_id
            # Get extracted text from document
            if doc.extracted_text:
                contract_text = doc.extracted_text
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Document has not been processed yet. Please wait for processing to complete.",
                )

        elif request.contract_text:
            contract_text = request.contract_text
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either document_id or contract_text must be provided.",
            )

        # Retrieve relevant context via RAG (if document is in Qdrant)
        rag_context = ""
        sources = []
        if document_id and settings.enable_rag:
            for query in CONTRACT_ANALYSIS_QUERIES[:5]:  # Limit queries for speed
                context, srcs = await self.rag.retrieve(
                    query=query,
                    user_id=user.id,
                    document_id=document_id,
                    top_k=3,
                )
                if context:
                    rag_context += f"\n{context}"
                sources.extend(srcs)

        # Prepare LLM for analysis
        llm = get_llm_service(provider=llm_provider or settings.default_llm_provider)

        # Truncate contract text to fit within context window
        max_contract_chars = 30000
        if len(contract_text) > max_contract_chars:
            truncated = contract_text[:max_contract_chars]
            logger.warning(
                "Contract text truncated",
                original_length=len(contract_text),
                truncated_length=max_contract_chars,
            )
            contract_text = truncated + "\n[... Contract continues, truncated for analysis ...]"

        # Build analysis prompt
        focus_note = ""
        if request.focus_areas:
            focus_note = f"\nPay special attention to these areas: {', '.join(request.focus_areas)}"

        analysis_prompt = f"""{LAWBOT_CONTRACT_ANALYSIS_PROMPT}

JURISDICTION: {request.jurisdiction}
{focus_note}

CONTRACT TO ANALYZE:
{contract_text}

{f"ADDITIONAL CONTEXT FROM RAG: {rag_context[:5000]}" if rag_context else ""}

STANDARD CLAUSES TO CHECK FOR PRESENCE:
{chr(10).join(f"- {clause}" for clause in STANDARD_CLAUSES_CHECKLIST)}

Provide a comprehensive analysis following the JSON format specified. Be specific about Indian law compliance."""

        try:
            response = await llm.chat(
                messages=[{"role": "user", "content": analysis_prompt}],
                system_prompt=None,  # Use default LawBot system prompt
                json_mode=True,
                temperature=0.05,  # Very low temperature for consistent analysis
                max_tokens=6000,
            )

            raw_content = response.get("content", "{}")
            parsed = llm.parse_json_response(raw_content)

            return self._build_analysis_response(
                parsed=parsed,
                document_id=document_id,
                request=request,
            )

        except Exception as e:
            logger.error("Contract analysis failed", error=str(e), exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Contract analysis failed: {str(e)}",
            )

    def _build_analysis_response(
        self,
        parsed: Dict[str, Any],
        document_id: Optional[uuid.UUID],
        request: ContractAnalysisRequest,
    ) -> ContractAnalysisResponse:
        """Build the final analysis response from parsed LLM output."""

        def parse_clauses(raw_list: List[Dict]) -> List[ClauseAnalysis]:
            clauses = []
            for item in raw_list:
                if not isinstance(item, dict):
                    continue
                try:
                    risk_str = item.get("risk_level", "LOW").upper()
                    # Map to valid values
                    from app.models.message import RiskLevel
                    try:
                        risk = RiskLevel(risk_str.lower())
                    except ValueError:
                        risk = RiskLevel.LOW

                    clauses.append(ClauseAnalysis(
                        clause_type=item.get("clause_type", "Unknown"),
                        clause_text=item.get("clause_text", ""),
                        section=item.get("section"),
                        risk_level=risk,
                        risk_explanation=item.get("risk_explanation", ""),
                        recommendation=item.get("recommendation"),
                        is_standard=item.get("is_standard", True),
                        is_missing=item.get("is_missing", False),
                    ))
                except Exception as e:
                    logger.warning("Failed to parse clause", error=str(e))
            return clauses

        def parse_parties(raw_list: List[Dict]) -> List[PartyInfo]:
            parties = []
            for item in raw_list:
                if isinstance(item, dict):
                    parties.append(PartyInfo(
                        name=item.get("name"),
                        role=item.get("role"),
                        address=item.get("address"),
                        entity_type=item.get("entity_type"),
                    ))
            return parties

        # Parse risk level
        from app.models.message import RiskLevel
        risk_str = parsed.get("risk_level", "MEDIUM").upper()
        try:
            risk_level = RiskLevel(risk_str.lower())
        except ValueError:
            risk_level = RiskLevel.MEDIUM

        # Calculate risk score if not provided
        risk_score = parsed.get("risk_score")
        if risk_score is None:
            risk_score_map = {"low": 15.0, "medium": 45.0, "high": 75.0, "critical": 95.0, "none": 0.0}
            risk_score = risk_score_map.get(risk_level.value, 50.0)
        else:
            try:
                risk_score = float(risk_score)
                risk_score = max(0.0, min(100.0, risk_score))
            except (TypeError, ValueError):
                risk_score = 50.0

        return ContractAnalysisResponse(
            analysis_id=uuid.uuid4(),
            document_id=document_id,
            risk_score=risk_score,
            risk_level=risk_level,
            overall_assessment=parsed.get("overall_assessment", "Analysis completed."),
            summary=parsed.get("summary", ""),
            contract_type=parsed.get("contract_type"),
            parties=parse_parties(parsed.get("parties", [])),
            effective_date=parsed.get("effective_date"),
            term_duration=parsed.get("term_duration"),
            jurisdiction=request.jurisdiction,
            governing_law=parsed.get("governing_law"),
            high_risk_clauses=parse_clauses(parsed.get("high_risk_clauses", [])),
            medium_risk_clauses=parse_clauses(parsed.get("medium_risk_clauses", [])),
            low_risk_clauses=parse_clauses(parsed.get("low_risk_clauses", [])),
            missing_clauses=parse_clauses(parsed.get("missing_clauses", [])),
            key_findings=parsed.get("key_findings", []),
            red_flags=parsed.get("red_flags", []),
            positive_aspects=parsed.get("positive_aspects", []),
            recommendations=parsed.get("recommendations", []),
            negotiation_points=parsed.get("negotiation_points", []),
            compliance_issues=parsed.get("compliance_issues", []),
            indian_law_compliance=parsed.get("indian_law_compliance"),
            confidence=float(parsed.get("confidence", 0.75)),
            analyzed_at=datetime.now(timezone.utc),
        )
