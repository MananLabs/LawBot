"""
Pydantic schemas for compliance tracking and management.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field

from app.models.compliance_event import (
    ComplianceStatus,
    CompliancePriority,
    ComplianceCategory,
)


class ComplianceEventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    description: Optional[str] = None
    category: ComplianceCategory
    regulation: Optional[str] = Field(None, max_length=500)
    due_date: datetime
    priority: CompliancePriority = CompliancePriority.MEDIUM
    penalty_amount: Optional[str] = Field(None, max_length=200)
    reminder_days: int = Field(default=7, ge=1, le=90)
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"str_strip_whitespace": True}


class ComplianceEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=500)
    description: Optional[str] = None
    category: Optional[ComplianceCategory] = None
    regulation: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[ComplianceStatus] = None
    priority: Optional[CompliancePriority] = None
    penalty_amount: Optional[str] = None
    reminder_days: Optional[int] = Field(None, ge=1, le=90)
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None

    model_config = {"str_strip_whitespace": True}


class ComplianceEventResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    category: ComplianceCategory
    regulation: Optional[str] = None
    due_date: datetime
    status: ComplianceStatus
    priority: CompliancePriority
    penalty_amount: Optional[str] = None
    reminder_days: int
    is_recurring: bool
    recurrence_pattern: Optional[str] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    days_until_due: Optional[int] = None
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplianceRiskMetrics(BaseModel):
    """Risk metrics for the compliance dashboard."""
    overall_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str
    critical_count: int
    high_priority_count: int
    overdue_count: int
    upcoming_7_days: int
    upcoming_30_days: int
    compliance_rate: float = Field(..., ge=0.0, le=100.0)


class ComplianceDashboardResponse(BaseModel):
    """Comprehensive compliance dashboard response."""
    # Summary
    total_events: int
    upcoming_events: List[ComplianceEventResponse]
    overdue_events: List[ComplianceEventResponse]
    completed_this_month: int

    # Risk Metrics
    risk_metrics: ComplianceRiskMetrics

    # Category Breakdown
    category_breakdown: Dict[str, int] = Field(default_factory=dict)

    # AI Recommendations
    ai_recommendations: List[str] = Field(default_factory=list)
    priority_actions: List[str] = Field(default_factory=list)

    # Calendar view - events organized by month
    calendar_data: Optional[Dict[str, List[Dict[str, Any]]]] = None

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ComplianceEventListResponse(BaseModel):
    events: List[ComplianceEventResponse]
    total: int
    page: int
    page_size: int
    overdue_count: int
    upcoming_count: int
