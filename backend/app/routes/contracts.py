"""
Contract analysis routes.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.contract import ContractAnalysisRequest, ContractAnalysisResponse
from app.services.contract_analyzer import ContractAnalyzerService

router = APIRouter(prefix="/contracts", tags=["Contract Analysis"])


@router.post(
    "/analyze",
    response_model=ContractAnalysisResponse,
    summary="Analyze a contract for risks and compliance",
)
async def analyze_contract(
    request: ContractAnalysisRequest,
    llm_provider: Optional[str] = Query(
        default=None,
        description="LLM provider: openai/anthropic/google"
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Perform comprehensive AI-powered contract analysis under Indian law.

    Analyzes:
    - All key contract clauses
    - Risk levels (LOW/MEDIUM/HIGH/CRITICAL)
    - Missing standard clauses
    - Indian law compliance
    - Negotiation recommendations

    Provide either:
    - `document_id`: ID of a previously uploaded document
    - `contract_text`: Raw contract text (up to 100,000 characters)
    """
    analyzer = ContractAnalyzerService(db)
    return await analyzer.analyze_contract(
        request=request,
        user=current_user,
        llm_provider=llm_provider,
    )


@router.post(
    "/analyze/quick",
    response_model=ContractAnalysisResponse,
    summary="Quick contract risk scan",
)
async def quick_analyze_contract(
    request: ContractAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Quick contract analysis focusing on high-risk clauses only.
    Faster than comprehensive analysis, suitable for initial screening.
    """
    # Force quick analysis type
    quick_request = ContractAnalysisRequest(
        document_id=request.document_id,
        contract_text=request.contract_text,
        analysis_type="quick",
        focus_areas=["termination", "liability", "ip", "payment"],
        jurisdiction=request.jurisdiction,
        counterparty_perspective=request.counterparty_perspective,
    )

    analyzer = ContractAnalyzerService(db)
    return await analyzer.analyze_contract(
        request=quick_request,
        user=current_user,
    )
