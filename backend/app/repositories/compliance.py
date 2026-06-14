"""
Compliance event repository.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compliance_event import (
    ComplianceEvent,
    ComplianceStatus,
    CompliancePriority,
    ComplianceCategory,
)
from app.repositories.base import BaseRepository


class ComplianceRepository(BaseRepository[ComplianceEvent]):
    """Repository for ComplianceEvent model CRUD operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(ComplianceEvent, db)

    async def get_user_events(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[ComplianceStatus] = None,
        category_filter: Optional[ComplianceCategory] = None,
        priority_filter: Optional[CompliancePriority] = None,
    ) -> Tuple[List[ComplianceEvent], int]:
        """Get paginated compliance events for a user with optional filters."""
        conditions = [ComplianceEvent.user_id == user_id]

        if status_filter:
            conditions.append(ComplianceEvent.status == status_filter)
        if category_filter:
            conditions.append(ComplianceEvent.category == category_filter)
        if priority_filter:
            conditions.append(ComplianceEvent.priority == priority_filter)

        base_query = select(ComplianceEvent).where(and_(*conditions))

        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            base_query
            .offset(skip)
            .limit(limit)
            .order_by(ComplianceEvent.due_date.asc())
        )
        return list(result.scalars().all()), total

    async def get_upcoming_events(
        self,
        user_id: uuid.UUID,
        days_ahead: int = 30,
    ) -> List[ComplianceEvent]:
        """Get upcoming compliance events within a given number of days."""
        now = datetime.now(timezone.utc)
        future_date = now + timedelta(days=days_ahead)

        result = await self.db.execute(
            select(ComplianceEvent).where(
                ComplianceEvent.user_id == user_id,
                ComplianceEvent.due_date >= now,
                ComplianceEvent.due_date <= future_date,
                ComplianceEvent.status.in_([
                    ComplianceStatus.UPCOMING,
                    ComplianceStatus.DUE_TODAY,
                ]),
            ).order_by(ComplianceEvent.due_date.asc())
        )
        return list(result.scalars().all())

    async def get_overdue_events(
        self, user_id: uuid.UUID
    ) -> List[ComplianceEvent]:
        """Get all overdue compliance events."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(ComplianceEvent).where(
                ComplianceEvent.user_id == user_id,
                ComplianceEvent.due_date < now,
                ComplianceEvent.status == ComplianceStatus.OVERDUE,
            ).order_by(ComplianceEvent.due_date.asc())
        )
        return list(result.scalars().all())

    async def get_by_id_and_user(
        self, event_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[ComplianceEvent]:
        """Get a compliance event ensuring it belongs to the user."""
        result = await self.db.execute(
            select(ComplianceEvent).where(
                ComplianceEvent.id == event_id,
                ComplianceEvent.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_category_breakdown(
        self, user_id: uuid.UUID
    ) -> Dict[str, int]:
        """Get count of events by category."""
        result = await self.db.execute(
            select(ComplianceEvent.category, func.count(ComplianceEvent.id))
            .where(ComplianceEvent.user_id == user_id)
            .group_by(ComplianceEvent.category)
        )
        return {str(row[0].value): row[1] for row in result.all()}

    async def update_overdue_statuses(self, user_id: uuid.UUID) -> int:
        """
        Mark events as overdue if their due date has passed.
        Returns the count of updated events.
        """
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(ComplianceEvent).where(
                ComplianceEvent.user_id == user_id,
                ComplianceEvent.due_date < now,
                ComplianceEvent.status == ComplianceStatus.UPCOMING,
            )
        )
        events = list(result.scalars().all())
        count = 0
        for event in events:
            event.status = ComplianceStatus.OVERDUE
            self.db.add(event)
            count += 1
        await self.db.flush()
        return count

    async def mark_completed(
        self, event_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[ComplianceEvent]:
        """Mark a compliance event as completed."""
        event = await self.get_by_id_and_user(event_id, user_id)
        if not event:
            return None
        event.status = ComplianceStatus.COMPLETED
        event.completed_at = datetime.now(timezone.utc)
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def count_by_status(
        self, user_id: uuid.UUID
    ) -> Dict[str, int]:
        """Get count of events by status."""
        result = await self.db.execute(
            select(ComplianceEvent.status, func.count(ComplianceEvent.id))
            .where(ComplianceEvent.user_id == user_id)
            .group_by(ComplianceEvent.status)
        )
        return {str(row[0].value): row[1] for row in result.all()}

    async def count_completed_this_month(self, user_id: uuid.UUID) -> int:
        """Count events completed this month."""
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        result = await self.db.execute(
            select(func.count()).where(
                ComplianceEvent.user_id == user_id,
                ComplianceEvent.status == ComplianceStatus.COMPLETED,
                ComplianceEvent.completed_at >= start_of_month,
            )
        )
        return result.scalar_one()
