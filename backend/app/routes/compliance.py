"""
Compliance tracking and management routes.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.compliance_event import ComplianceStatus, CompliancePriority, ComplianceCategory
from app.models.user import User
from app.schemas.compliance import (
    ComplianceEventCreate,
    ComplianceEventUpdate,
    ComplianceEventResponse,
    ComplianceDashboardResponse,
    ComplianceEventListResponse,
)
from app.services.compliance import ComplianceService

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get(
    "/dashboard",
    response_model=ComplianceDashboardResponse,
    summary="Get compliance dashboard",
)
async def get_compliance_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the comprehensive compliance dashboard with:
    - Upcoming and overdue deadlines
    - Risk score and metrics
    - Category breakdown
    - AI-powered recommendations
    - Priority action items
    - Calendar view of events

    Automatically updates status of overdue events.
    """
    compliance_service = ComplianceService(db)
    return await compliance_service.get_dashboard(current_user)


@router.get(
    "/events",
    response_model=ComplianceEventListResponse,
    summary="List compliance events",
)
async def list_compliance_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by status: upcoming/due_today/overdue/completed/waived",
    ),
    category_filter: Optional[str] = Query(
        default=None,
        alias="category",
        description="Filter by category: roc_filing/gst/tds/income_tax/sebi/etc.",
    ),
    priority_filter: Optional[str] = Query(
        default=None,
        alias="priority",
        description="Filter by priority: low/medium/high/critical",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of compliance events with optional filters.
    """
    # Parse filter values
    status_enum = None
    if status_filter:
        try:
            status_enum = ComplianceStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}",
            )

    category_enum = None
    if category_filter:
        try:
            category_enum = ComplianceCategory(category_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category: {category_filter}",
            )

    priority_enum = None
    if priority_filter:
        try:
            priority_enum = CompliancePriority(priority_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority: {priority_filter}",
            )

    compliance_service = ComplianceService(db)
    return await compliance_service.get_events(
        user=current_user,
        skip=(page - 1) * page_size,
        limit=page_size,
        status_filter=status_enum,
        category_filter=category_enum,
        priority_filter=priority_enum,
    )


@router.post(
    "/events",
    response_model=ComplianceEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a compliance event",
)
async def create_compliance_event(
    request: ComplianceEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new compliance tracking event.

    Supports:
    - One-time deadlines
    - Recurring events (monthly/quarterly/annual)
    - Custom reminder days before due date
    - Priority levels and penalty information
    """
    compliance_service = ComplianceService(db)
    return await compliance_service.create_event(request=request, user=current_user)


@router.get(
    "/events/{event_id}",
    response_model=ComplianceEventResponse,
    summary="Get a compliance event",
)
async def get_compliance_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific compliance event.
    """
    from app.repositories.compliance import ComplianceRepository
    compliance_repo = ComplianceRepository(db)

    event = await compliance_repo.get_by_id_and_user(event_id, current_user.id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance event not found.",
        )

    compliance_service = ComplianceService(db)
    return compliance_service._event_to_response(event)


@router.put(
    "/events/{event_id}",
    response_model=ComplianceEventResponse,
    summary="Update a compliance event",
)
async def update_compliance_event(
    event_id: uuid.UUID,
    request: ComplianceEventUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a compliance event.
    Can update status, due date, notes, and other fields.
    """
    compliance_service = ComplianceService(db)
    result = await compliance_service.update_event(
        event_id=event_id,
        request=request,
        user=current_user,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance event not found.",
        )

    return result


@router.post(
    "/events/{event_id}/complete",
    response_model=ComplianceEventResponse,
    summary="Mark compliance event as completed",
)
async def complete_compliance_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a compliance event as completed.
    Records the completion timestamp automatically.
    """
    from app.repositories.compliance import ComplianceRepository
    compliance_repo = ComplianceRepository(db)

    event = await compliance_repo.mark_completed(event_id, current_user.id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance event not found.",
        )

    compliance_service = ComplianceService(db)
    return compliance_service._event_to_response(event)


@router.delete(
    "/events/{event_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a compliance event",
)
async def delete_compliance_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a compliance event permanently.
    """
    from app.repositories.compliance import ComplianceRepository
    compliance_repo = ComplianceRepository(db)

    event = await compliance_repo.get_by_id_and_user(event_id, current_user.id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance event not found.",
        )

    await compliance_repo.delete(event_id)
    return {"message": "Compliance event deleted successfully."}


@router.post(
    "/seed-defaults",
    status_code=status.HTTP_201_CREATED,
    summary="Seed default compliance events",
)
async def seed_default_compliance_events(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Seed default compliance events for Indian startups/companies.
    Creates common recurring compliance deadlines (GST, TDS, ROC filings, etc.)

    Useful for new users to get started with compliance tracking.
    """
    compliance_service = ComplianceService(db)
    events = await compliance_service.seed_default_events(current_user)
    return {
        "message": f"Created {len(events)} default compliance events.",
        "events_created": len(events),
    }
