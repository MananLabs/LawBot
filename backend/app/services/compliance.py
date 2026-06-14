"""
Compliance tracking and deadline management service.
Provides AI-powered compliance recommendations for Indian corporate law.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance_event import ComplianceStatus, CompliancePriority
from app.models.user import User
from app.repositories.compliance import ComplianceRepository
from app.schemas.compliance import (
    ComplianceEventCreate,
    ComplianceEventUpdate,
    ComplianceEventResponse,
    ComplianceDashboardResponse,
    ComplianceRiskMetrics,
    ComplianceEventListResponse,
)
from app.services.llm import get_llm_service

logger = structlog.get_logger(__name__)

# Default compliance calendar for Indian startups/SMEs
DEFAULT_COMPLIANCE_EVENTS = [
    {
        "title": "GST Monthly Return (GSTR-3B)",
        "category": "gst",
        "regulation": "GST Act 2017 - Section 39",
        "priority": "high",
        "penalty_amount": "Rs. 50/day (Min Rs. 200, Max 0.25% of turnover)",
        "reminder_days": 7,
        "is_recurring": True,
        "recurrence_pattern": "monthly",
    },
    {
        "title": "TDS Return Filing (Form 24Q/26Q)",
        "category": "tds",
        "regulation": "Income Tax Act 1961 - Section 200",
        "priority": "high",
        "penalty_amount": "Rs. 200/day for late filing",
        "reminder_days": 7,
        "is_recurring": True,
        "recurrence_pattern": "quarterly",
    },
    {
        "title": "Annual Return (MGT-7)",
        "category": "roc_filing",
        "regulation": "Companies Act 2013 - Section 92",
        "priority": "high",
        "penalty_amount": "Rs. 100/day for late filing",
        "reminder_days": 14,
        "is_recurring": True,
        "recurrence_pattern": "annual",
    },
    {
        "title": "Financial Statements Filing (AOC-4)",
        "category": "roc_filing",
        "regulation": "Companies Act 2013 - Section 137",
        "priority": "high",
        "penalty_amount": "Rs. 1000/day for officers",
        "reminder_days": 14,
        "is_recurring": True,
        "recurrence_pattern": "annual",
    },
    {
        "title": "Advance Tax Payment (Q2)",
        "category": "income_tax",
        "regulation": "Income Tax Act 1961 - Section 211",
        "priority": "medium",
        "penalty_amount": "1% per month (Section 234B/C)",
        "reminder_days": 7,
        "is_recurring": True,
        "recurrence_pattern": "quarterly",
    },
    {
        "title": "PF/ESI Monthly Contribution",
        "category": "labour_law",
        "regulation": "EPF Act 1952, ESI Act 1948",
        "priority": "high",
        "penalty_amount": "12% penalty on delayed deposit",
        "reminder_days": 5,
        "is_recurring": True,
        "recurrence_pattern": "monthly",
    },
]


class ComplianceService:
    """
    Service for compliance tracking, deadline management, and AI recommendations.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.compliance_repo = ComplianceRepository(db)

    async def get_dashboard(self, user: User) -> ComplianceDashboardResponse:
        """
        Generate a comprehensive compliance dashboard with AI recommendations.

        Args:
            user: Authenticated user

        Returns:
            ComplianceDashboardResponse with full compliance status
        """
        # Update overdue statuses first
        await self.compliance_repo.update_overdue_statuses(user.id)

        # Get upcoming events (next 30 days)
        upcoming = await self.compliance_repo.get_upcoming_events(user.id, days_ahead=30)

        # Get overdue events
        overdue = await self.compliance_repo.get_overdue_events(user.id)

        # Get category breakdown
        category_breakdown = await self.compliance_repo.get_category_breakdown(user.id)

        # Get status counts
        status_counts = await self.compliance_repo.count_by_status(user.id)

        # Completed this month
        completed_this_month = await self.compliance_repo.count_completed_this_month(user.id)

        # Calculate risk metrics
        risk_metrics = self._calculate_risk_metrics(
            upcoming=upcoming,
            overdue=overdue,
            status_counts=status_counts,
        )

        # Serialize events
        upcoming_responses = [
            self._event_to_response(event) for event in upcoming
        ]
        overdue_responses = [
            self._event_to_response(event) for event in overdue
        ]

        # Get AI recommendations
        ai_recommendations = await self._get_ai_recommendations(
            upcoming=upcoming,
            overdue=overdue,
            risk_metrics=risk_metrics,
        )

        # Build calendar data
        calendar_data = self._build_calendar_data(upcoming + overdue)

        # Total events
        total = sum(status_counts.values())

        return ComplianceDashboardResponse(
            total_events=total,
            upcoming_events=upcoming_responses,
            overdue_events=overdue_responses,
            completed_this_month=completed_this_month,
            risk_metrics=risk_metrics,
            category_breakdown=category_breakdown,
            ai_recommendations=ai_recommendations,
            priority_actions=self._get_priority_actions(overdue, upcoming),
            calendar_data=calendar_data,
            generated_at=datetime.now(timezone.utc),
        )

    async def get_events(
        self,
        user: User,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[ComplianceStatus] = None,
        category_filter=None,
        priority_filter: Optional[CompliancePriority] = None,
    ) -> ComplianceEventListResponse:
        """Get paginated compliance events with optional filters."""
        # Update statuses
        await self.compliance_repo.update_overdue_statuses(user.id)

        events, total = await self.compliance_repo.get_user_events(
            user_id=user.id,
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            category_filter=category_filter,
            priority_filter=priority_filter,
        )

        # Count overdue and upcoming
        overdue = await self.compliance_repo.get_overdue_events(user.id)
        upcoming = await self.compliance_repo.get_upcoming_events(user.id, days_ahead=7)

        return ComplianceEventListResponse(
            events=[self._event_to_response(e) for e in events],
            total=total,
            page=skip // limit + 1,
            page_size=limit,
            overdue_count=len(overdue),
            upcoming_count=len(upcoming),
        )

    async def create_event(
        self,
        request: ComplianceEventCreate,
        user: User,
    ) -> ComplianceEventResponse:
        """Create a new compliance event."""
        event = await self.compliance_repo.create({
            "user_id": user.id,
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "regulation": request.regulation,
            "due_date": request.due_date,
            "status": ComplianceStatus.UPCOMING,
            "priority": request.priority,
            "penalty_amount": request.penalty_amount,
            "reminder_days": request.reminder_days,
            "is_recurring": request.is_recurring,
            "recurrence_pattern": request.recurrence_pattern,
            "notes": request.notes,
        })
        return self._event_to_response(event)

    async def update_event(
        self,
        event_id: uuid.UUID,
        request: ComplianceEventUpdate,
        user: User,
    ) -> Optional[ComplianceEventResponse]:
        """Update an existing compliance event."""
        event = await self.compliance_repo.get_by_id_and_user(event_id, user.id)
        if not event:
            return None

        update_data = request.model_dump(exclude_none=True, exclude_unset=True)
        updated = await self.compliance_repo.update(event_id, update_data)

        if not updated:
            return None

        return self._event_to_response(updated)

    async def seed_default_events(
        self, user: User, company_type: str = "startup"
    ) -> List[ComplianceEventResponse]:
        """
        Seed default compliance events for a new user.
        Creates upcoming events based on current date.
        """
        now = datetime.now(timezone.utc)
        created_events = []

        for event_data in DEFAULT_COMPLIANCE_EVENTS:
            # Calculate next due date
            due_date = self._calculate_next_due_date(
                event_data["recurrence_pattern"],
                now,
            )

            try:
                from app.models.compliance_event import ComplianceCategory, CompliancePriority as CP
                event = await self.compliance_repo.create({
                    "user_id": user.id,
                    "title": event_data["title"],
                    "category": ComplianceCategory(event_data["category"]),
                    "regulation": event_data["regulation"],
                    "due_date": due_date,
                    "status": ComplianceStatus.UPCOMING,
                    "priority": CP(event_data["priority"]),
                    "penalty_amount": event_data.get("penalty_amount"),
                    "reminder_days": event_data.get("reminder_days", 7),
                    "is_recurring": event_data.get("is_recurring", False),
                    "recurrence_pattern": event_data.get("recurrence_pattern"),
                })
                created_events.append(self._event_to_response(event))
            except Exception as e:
                logger.error("Failed to create default event", error=str(e), title=event_data["title"])

        return created_events

    def _calculate_next_due_date(self, pattern: str, from_date: datetime) -> datetime:
        """Calculate the next due date based on recurrence pattern."""
        if pattern == "monthly":
            # Next month's 20th (common GST deadline)
            next_month = from_date.replace(day=1) + timedelta(days=32)
            return next_month.replace(day=20, hour=0, minute=0, second=0, microsecond=0)
        elif pattern == "quarterly":
            # Next quarter end
            current_month = from_date.month
            quarter_end_months = [3, 6, 9, 12]
            next_quarter_end = next(m for m in quarter_end_months if m > current_month)
            return from_date.replace(month=next_quarter_end, day=30, hour=23, minute=59)
        elif pattern == "annual":
            # September 30th (common annual filing deadline)
            year = from_date.year if from_date.month <= 8 else from_date.year + 1
            return datetime(year, 9, 30, tzinfo=timezone.utc)
        else:
            return from_date + timedelta(days=30)

    def _calculate_risk_metrics(
        self,
        upcoming: list,
        overdue: list,
        status_counts: Dict[str, int],
    ) -> ComplianceRiskMetrics:
        """Calculate compliance risk metrics."""
        total = sum(status_counts.values())
        completed = status_counts.get("completed", 0)
        compliance_rate = (completed / total * 100) if total > 0 else 100.0

        overdue_count = len(overdue)
        critical_count = sum(
            1 for e in overdue if e.priority == CompliancePriority.CRITICAL
        )
        high_priority_count = sum(
            1 for e in (upcoming + overdue)
            if e.priority in (CompliancePriority.HIGH, CompliancePriority.CRITICAL)
        )

        now = datetime.now(timezone.utc)
        upcoming_7 = sum(
            1 for e in upcoming
            if (e.due_date - now).days <= 7
        )
        upcoming_30 = len(upcoming)

        # Risk score: higher = worse
        risk_score = min(100.0, (
            overdue_count * 20 +
            critical_count * 30 +
            high_priority_count * 10 +
            upcoming_7 * 5
        ))
        risk_score = max(0.0, 100.0 - compliance_rate * 0.5 + risk_score * 0.5)

        if risk_score >= 75:
            risk_level = "CRITICAL"
        elif risk_score >= 50:
            risk_level = "HIGH"
        elif risk_score >= 25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return ComplianceRiskMetrics(
            overall_risk_score=round(risk_score, 1),
            risk_level=risk_level,
            critical_count=critical_count,
            high_priority_count=high_priority_count,
            overdue_count=overdue_count,
            upcoming_7_days=upcoming_7,
            upcoming_30_days=upcoming_30,
            compliance_rate=round(compliance_rate, 1),
        )

    async def _get_ai_recommendations(
        self,
        upcoming: list,
        overdue: list,
        risk_metrics: ComplianceRiskMetrics,
    ) -> List[str]:
        """Generate AI-powered compliance recommendations."""
        if not upcoming and not overdue:
            return [
                "No compliance events found. Consider setting up your compliance calendar.",
                "Use LawBot to add compliance deadlines specific to your business type and industry.",
            ]

        # Build a concise summary for the LLM
        overdue_titles = [e.title for e in overdue[:5]]
        upcoming_titles = [e.title for e in upcoming[:5]]

        prompt = f"""As a compliance expert for Indian corporate law, provide 3-5 specific, actionable compliance recommendations based on this situation:

RISK LEVEL: {risk_metrics.risk_level} (Score: {risk_metrics.overall_risk_score}/100)
OVERDUE EVENTS ({len(overdue)}): {', '.join(overdue_titles) if overdue_titles else 'None'}
UPCOMING EVENTS ({len(upcoming)}): {', '.join(upcoming_titles) if upcoming_titles else 'None'}
COMPLIANCE RATE: {risk_metrics.compliance_rate}%

Provide exactly 4 specific recommendations as a JSON array of strings. Focus on:
1. Immediate action items for overdue events
2. Upcoming deadline preparation
3. Risk mitigation
4. Process improvement

Return ONLY a JSON array: ["recommendation 1", "recommendation 2", ...]"""

        try:
            llm = get_llm_service()
            response = await llm.chat(
                messages=[{"role": "user", "content": prompt}],
                json_mode=True,
                temperature=0.3,
                max_tokens=500,
            )
            content = response.get("content", "[]")
            import json
            parsed = json.loads(content) if isinstance(content, str) else content
            if isinstance(parsed, list):
                return [str(r) for r in parsed[:5]]
        except Exception as e:
            logger.warning("AI recommendations failed", error=str(e))

        # Fallback recommendations
        recommendations = []
        if overdue:
            recommendations.append(
                f"URGENT: {len(overdue)} compliance deadline(s) are overdue. File immediately to avoid penalties."
            )
        if risk_metrics.upcoming_7_days > 0:
            recommendations.append(
                f"{risk_metrics.upcoming_7_days} deadline(s) due within 7 days. Prepare documentation now."
            )
        recommendations.append(
            "Set up automated reminders for recurring compliance deadlines to avoid late filing penalties."
        )
        recommendations.append(
            "Consider engaging a CA/CS for quarterly compliance review and filing."
        )
        return recommendations

    def _get_priority_actions(self, overdue: list, upcoming: list) -> List[str]:
        """Get top priority actions from overdue and critical upcoming events."""
        actions = []

        for event in overdue[:3]:
            actions.append(f"OVERDUE: File {event.title} immediately to avoid penalties")

        critical_upcoming = [
            e for e in upcoming
            if e.priority == CompliancePriority.CRITICAL
        ]
        for event in critical_upcoming[:3]:
            days = max(0, (event.due_date - datetime.now(timezone.utc)).days)
            actions.append(f"CRITICAL: {event.title} due in {days} days")

        return actions[:5]

    def _build_calendar_data(self, events: list) -> Dict[str, List[Dict[str, Any]]]:
        """Organize events by month for calendar display."""
        calendar: Dict[str, List[Dict[str, Any]]] = {}

        for event in events:
            month_key = event.due_date.strftime("%Y-%m")
            if month_key not in calendar:
                calendar[month_key] = []
            calendar[month_key].append({
                "id": str(event.id),
                "title": event.title,
                "due_date": event.due_date.isoformat(),
                "status": event.status.value,
                "priority": event.priority.value,
                "category": event.category.value,
            })

        return calendar

    def _event_to_response(self, event) -> ComplianceEventResponse:
        """Convert a ComplianceEvent model to a response schema."""
        now = datetime.now(timezone.utc)
        due_date = event.due_date

        # Ensure timezone awareness
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)

        days_until_due = (due_date - now).days
        is_overdue = due_date < now and event.status != ComplianceStatus.COMPLETED

        return ComplianceEventResponse(
            id=event.id,
            user_id=event.user_id,
            title=event.title,
            description=event.description,
            category=event.category,
            regulation=event.regulation,
            due_date=event.due_date,
            status=event.status,
            priority=event.priority,
            penalty_amount=event.penalty_amount,
            reminder_days=event.reminder_days,
            is_recurring=event.is_recurring,
            recurrence_pattern=event.recurrence_pattern,
            completed_at=event.completed_at,
            notes=event.notes,
            days_until_due=days_until_due,
            is_overdue=is_overdue,
            created_at=event.created_at,
            updated_at=event.updated_at,
        )
