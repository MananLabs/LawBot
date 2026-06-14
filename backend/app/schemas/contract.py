"""
Pydantic schemas for contract analysis.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field

from app.models.message import RiskLevel


class ClauseAnalysis(BaseModel):
    """Analysis of a specific contract clause."""
    clause_type: str
    clause_text: str
    section: Optional[str] = None
    risk_level: RiskLevel
    risk_explanation: str
    recommendation: Optional[str] = None
    is_standard: bool = True
    is_missing: bool = False


class PartyInfo(BaseModel):
    """Information about a contract party."""
    name: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None
    entity_type: Optional[str] = None


class ContractAnalysisRequest(BaseModel):
    """Request to analyze a contract."""
    document_id: Optional[uuid.UUID] = None
    contract_text: Optional[str] = Field(None, max_length=100000)
    analysis_type: str = Field(
        default="comprehensive",
        description="Type of analysis: comprehensive, quick, specific_clauses"
    )
    focus_areas: Optional[List[str]] = Field(
        default=None,
        description="Specific areas to focus on: payment, termination, liability, ip, etc."
    )
    jurisdiction: str = Field(default="India")
    counterparty_perspective: bool = Field(
        default=False,
        description="Analyze from counterparty perspective to identify risks they may raise"
    )


class ContractAnalysisResponse(BaseModel):
    """Comprehensive contract analysis response."""
    analysis_id: Optional[uuid.UUID] = None
    document_id: Optional[uuid.UUID] = None

    # Overall Assessment
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Overall risk score 0-100")
    risk_level: RiskLevel
    overall_assessment: str
    summary: str

    # Contract Details
    contract_type: Optional[str] = None
    parties: List[PartyInfo] = Field(default_factory=list)
    effective_date: Optional[str] = None
    term_duration: Optional[str] = None
    jurisdiction: str = "India"
    governing_law: Optional[str] = None

    # Clause Analysis
    high_risk_clauses: List[ClauseAnalysis] = Field(default_factory=list)
    medium_risk_clauses: List[ClauseAnalysis] = Field(default_factory=list)
    low_risk_clauses: List[ClauseAnalysis] = Field(default_factory=list)
    missing_clauses: List[ClauseAnalysis] = Field(default_factory=list)

    # Key Findings
    key_findings: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    positive_aspects: List[str] = Field(default_factory=list)

    # Recommendations
    recommendations: List[str] = Field(default_factory=list)
    negotiation_points: List[str] = Field(default_factory=list)

    # Compliance
    compliance_issues: List[str] = Field(default_factory=list)
    indian_law_compliance: Optional[str] = None

    # Metadata
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    disclaimer: str = (
        "This analysis is for informational purposes only and should not be "
        "considered legal advice. Please consult a qualified legal professional "
        "before making any decisions based on this analysis."
    )
    analyzed_at: Optional[datetime] = None
