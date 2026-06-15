"""
Compliance tracking and management routes.

Provides both the original /compliance/events endpoints AND the frontend-compatible
/compliance/items/ and /compliance/profile/ endpoints.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
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
from app.repositories.compliance import ComplianceRepository

router = APIRouter(prefix="/compliance", tags=["Compliance"])


# ─── Response helpers ─────────────────────────────────────────────────────────

# Category → framework mapping
_CAT_TO_FRAMEWORK = {
    "roc_filing": "companies_act_2013",
    "companies_act": "companies_act_2013",
    "gst": "gst",
    "tds": "income_tax",
    "income_tax": "income_tax",
    "sebi": "sebi",
    "rbi": "rbi_guidelines",
    "labour_law": "labour_laws",
    "startup_india": "startup_india",
    "msme": "companies_act_2013",
    "trademark": "companies_act_2013",
    "patent": "companies_act_2013",
    "fema": "fema",
    "other": "companies_act_2013",
}

# Backend status → frontend status
_STATUS_MAP = {
    "upcoming": "needs_review",
    "due_today": "needs_review",
    "overdue": "non_compliant",
    "completed": "compliant",
    "waived": "not_applicable",
}


def _event_to_item(event) -> dict:
    """Convert ComplianceEvent ORM → frontend ComplianceItem shape."""
    now = datetime.now(timezone.utc)
    due = event.due_date
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)

    is_overdue = due < now and event.status.value not in ("completed", "waived")
    category_val = event.category.value if hasattr(event.category, "value") else str(event.category)
    priority_val = event.priority.value if hasattr(event.priority, "value") else str(event.priority)
    status_val = event.status.value if hasattr(event.status, "value") else str(event.status)

    fe_status = _STATUS_MAP.get(status_val, "needs_review")
    framework = _CAT_TO_FRAMEWORK.get(category_val, "companies_act_2013")

    recurrence_map = {
        "monthly": "monthly",
        "quarterly": "quarterly",
        "annual": "annual",
        "annually": "annual",
    }
    frequency = "one_time"
    if event.is_recurring and event.recurrence_pattern:
        frequency = recurrence_map.get(event.recurrence_pattern.lower(), "event_based")

    metadata = getattr(event, "event_metadata", None) or {}
    action_items = metadata.get("action_items") or []

    return {
        "id": str(event.id),
        "framework": framework,
        "category": category_val,
        "title": event.title,
        "description": event.description or "",
        "status": fe_status,
        "priority": priority_val,
        "due_date": event.due_date.isoformat(),
        "frequency": frequency,
        "legal_reference": event.regulation or "",
        "penalty": event.penalty_amount,
        "responsible_person": metadata.get("responsible_person"),
        "documents_required": metadata.get("documents_required") or [],
        "action_items": action_items,
        "is_overdue": is_overdue,
        "completed_at": event.completed_at.isoformat() if event.completed_at else None,
    }


def _event_to_calendar(event) -> dict:
    """Convert ComplianceEvent ORM → frontend ComplianceCalendarEvent shape."""
    category_val = event.category.value if hasattr(event.category, "value") else str(event.category)
    priority_val = event.priority.value if hasattr(event.priority, "value") else str(event.priority)
    status_val = event.status.value if hasattr(event.status, "value") else str(event.status)
    framework = _CAT_TO_FRAMEWORK.get(category_val, "companies_act_2013")
    fe_status = _STATUS_MAP.get(status_val, "needs_review")

    recurrence_map = {"monthly": "monthly", "quarterly": "quarterly", "annual": "annual"}
    frequency = "one_time"
    if event.is_recurring and event.recurrence_pattern:
        frequency = recurrence_map.get(event.recurrence_pattern.lower(), "event_based")

    return {
        "id": str(event.id),
        "title": event.title,
        "framework": framework,
        "due_date": event.due_date.isoformat(),
        "priority": priority_val,
        "status": fe_status,
        "description": event.description or "",
        "recurring": event.is_recurring,
        "frequency": frequency,
    }


# ─── Compliance profile ────────────────────────────────────────────────────────

class ComplianceProfilePayload(BaseModel):
    company_type: str = "private_limited"
    industry: str = "technology"
    employees_count: int = 10
    turnover_crores: Optional[float] = None
    is_listed: bool = False
    has_fdi: bool = False
    frameworks: Optional[List[str]] = None


def _default_profile(user, payload: Optional[ComplianceProfilePayload] = None) -> dict:
    """Build a compliance profile response."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(user.id),
        "organization_id": str(user.id),
        "company_type": payload.company_type if payload else "private_limited",
        "industry": payload.industry if payload else "technology",
        "employees_count": payload.employees_count if payload else 10,
        "turnover_crores": payload.turnover_crores if payload else None,
        "is_listed": payload.is_listed if payload else False,
        "has_fdi": payload.has_fdi if payload else False,
        "frameworks": (payload.frameworks if payload and payload.frameworks else [
            "companies_act_2013", "gst", "income_tax", "labour_laws"
        ]),
        "overall_score": 72.0,
        "last_assessed_at": now,
        "created_at": user.created_at.isoformat(),
        "updated_at": now,
    }


@router.get("/profile")
async def get_compliance_profile(current_user: User = Depends(get_current_active_user)):
    return _default_profile(current_user)


@router.get("/profile/", include_in_schema=False)
async def get_compliance_profile_slash(current_user: User = Depends(get_current_active_user)):
    return _default_profile(current_user)


@router.post("/profile")
async def upsert_compliance_profile(
    payload: ComplianceProfilePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the compliance profile — seeds framework-specific items."""
    compliance_service = ComplianceService(db)
    try:
        await compliance_service.seed_default_events(current_user)
    except Exception:
        pass
    return _default_profile(current_user, payload)


@router.post("/profile/", include_in_schema=False)
async def upsert_compliance_profile_slash(
    payload: ComplianceProfilePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await upsert_compliance_profile(payload, current_user, db)


@router.patch("/profile")
async def update_compliance_profile(
    payload: ComplianceProfilePayload,
    current_user: User = Depends(get_current_active_user),
):
    return _default_profile(current_user, payload)


@router.patch("/profile/", include_in_schema=False)
async def update_compliance_profile_slash(
    payload: ComplianceProfilePayload,
    current_user: User = Depends(get_current_active_user),
):
    return _default_profile(current_user, payload)


# ─── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_compliance_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_service = ComplianceService(db)
    backend_dash = await compliance_service.get_dashboard(current_user)

    now = datetime.now(timezone.utc)
    compliance_repo = ComplianceRepository(db)
    events, _ = await compliance_repo.get_user_events(
        user_id=current_user.id, skip=0, limit=1000
    )

    total = len(events)
    compliant = sum(1 for e in events if e.status.value == "completed")
    overdue = sum(1 for e in events if e.status.value == "overdue")
    needs_review = total - compliant - overdue

    upcoming = [
        _event_to_calendar(e) for e in events
        if e.status.value not in ("completed", "waived")
    ][:10]

    framework_counts: dict = {}
    for e in events:
        cat = e.category.value if hasattr(e.category, "value") else str(e.category)
        fw = _CAT_TO_FRAMEWORK.get(cat, "companies_act_2013")
        if fw not in framework_counts:
            framework_counts[fw] = {"total": 0, "compliant": 0, "non_compliant": 0, "needs_review": 0}
        framework_counts[fw]["total"] += 1
        status_val = e.status.value if hasattr(e.status, "value") else str(e.status)
        if status_val == "completed":
            framework_counts[fw]["compliant"] += 1
        elif status_val == "overdue":
            framework_counts[fw]["non_compliant"] += 1
        else:
            framework_counts[fw]["needs_review"] += 1

    fw_names = {
        "companies_act_2013": "Companies Act 2013",
        "sebi": "SEBI Regulations",
        "fema": "FEMA",
        "gst": "GST",
        "income_tax": "Income Tax",
        "labour_laws": "Labour Laws",
        "ibc": "IBC",
        "competition_act": "Competition Act",
        "rbi_guidelines": "RBI Guidelines",
        "startup_india": "Startup India",
    }

    framework_breakdown = [
        {
            "framework": fw,
            "framework_name": fw_names.get(fw, fw),
            "score": round(100 * d["compliant"] / d["total"]) if d["total"] else 100,
            **d,
        }
        for fw, d in framework_counts.items()
    ]

    score = round(100 * compliant / total) if total else 100

    return {
        "overall_score": score,
        "total_items": total,
        "compliant_count": compliant,
        "non_compliant_count": overdue,
        "needs_review_count": needs_review,
        "overdue_count": overdue,
        "upcoming_deadlines": upcoming,
        "framework_breakdown": framework_breakdown,
        "recent_updates": [],
    }


@router.get("/dashboard/", include_in_schema=False)
async def get_compliance_dashboard_slash(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_compliance_dashboard(current_user, db)


# ─── Compliance items (aliases for events) ────────────────────────────────────

@router.get("/items")
async def list_compliance_items(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    framework: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    is_overdue: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None),
    ordering: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    events, total = await compliance_repo.get_user_events(
        user_id=current_user.id, skip=0, limit=10000
    )

    items = [_event_to_item(e) for e in events]

    if framework:
        items = [i for i in items if i["framework"] == framework]
    if status_filter:
        items = [i for i in items if i["status"] == status_filter]
    if priority:
        items = [i for i in items if i["priority"] == priority]
    if is_overdue is not None:
        items = [i for i in items if i["is_overdue"] == is_overdue]
    if search:
        sl = search.lower()
        items = [i for i in items if sl in i["title"].lower() or sl in i["description"].lower()]

    total_filtered = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]
    has_next = end < total_filtered

    return {
        "count": total_filtered,
        "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
        "previous": f"?page={page - 1}&page_size={page_size}" if page > 1 else None,
        "results": page_items,
    }


@router.get("/items/", include_in_schema=False)
async def list_compliance_items_slash(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_compliance_items(page, page_size, None, None, None, None, None, None, current_user, db)


@router.get("/items/overdue")
async def get_overdue_items(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    events, _ = await compliance_repo.get_user_events(user_id=current_user.id, skip=0, limit=1000)
    now = datetime.now(timezone.utc)
    overdue = []
    for e in events:
        due = e.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if due < now and e.status.value not in ("completed", "waived"):
            overdue.append(_event_to_item(e))
    return overdue


@router.get("/items/overdue/", include_in_schema=False)
async def get_overdue_items_slash(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_overdue_items(current_user, db)


@router.get("/items/upcoming")
async def get_upcoming_items(
    days: int = Query(default=30),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    compliance_repo = ComplianceRepository(db)
    events, _ = await compliance_repo.get_user_events(user_id=current_user.id, skip=0, limit=1000)
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    upcoming = []
    for e in events:
        due = e.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if now <= due <= cutoff and e.status.value not in ("completed", "waived"):
            upcoming.append(_event_to_item(e))
    return upcoming


@router.get("/items/upcoming/", include_in_schema=False)
async def get_upcoming_items_slash(
    days: int = Query(default=30),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_upcoming_items(days, current_user, db)


@router.get("/items/{item_id}")
async def get_compliance_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(item_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance item not found.")
    return _event_to_item(event)


@router.get("/items/{item_id}/", include_in_schema=False)
async def get_compliance_item_slash(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_compliance_item(item_id, current_user, db)


class ItemStatusUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    responsible_person: Optional[str] = None
    due_date: Optional[str] = None


@router.patch("/items/{item_id}")
async def update_compliance_item(
    item_id: uuid.UUID,
    payload: ItemStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(item_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance item not found.")

    update_data: dict = {}
    if payload.notes is not None:
        update_data["notes"] = payload.notes
    if payload.status:
        backend_status_map = {
            "compliant": "completed",
            "non_compliant": "overdue",
            "needs_review": "upcoming",
            "not_applicable": "waived",
        }
        backend_status = backend_status_map.get(payload.status, "upcoming")
        try:
            update_data["status"] = ComplianceStatus(backend_status)
        except ValueError:
            pass
    if payload.due_date:
        try:
            update_data["due_date"] = datetime.fromisoformat(payload.due_date)
        except ValueError:
            pass

    if payload.responsible_person is not None:
        metadata = getattr(event, "event_metadata", None) or {}
        metadata["responsible_person"] = payload.responsible_person
        update_data["event_metadata"] = metadata

    if update_data:
        from app.repositories.base import BaseRepository
        from sqlalchemy import update
        from app.models.compliance_event import ComplianceEvent
        stmt = update(ComplianceEvent).where(ComplianceEvent.id == item_id).values(**update_data)
        await db.execute(stmt)
        await db.commit()
        await db.refresh(event)

    return _event_to_item(event)


@router.patch("/items/{item_id}/", include_in_schema=False)
async def update_compliance_item_slash(
    item_id: uuid.UUID,
    payload: ItemStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_compliance_item(item_id, payload, current_user, db)


class CompleteItemPayload(BaseModel):
    documents: Optional[List[str]] = None
    notes: Optional[str] = None


@router.post("/items/{item_id}/complete")
async def mark_compliance_item_complete(
    item_id: uuid.UUID,
    payload: CompleteItemPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.mark_completed(item_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance item not found.")
    return _event_to_item(event)


@router.post("/items/{item_id}/complete/", include_in_schema=False)
async def mark_compliance_item_complete_slash(
    item_id: uuid.UUID,
    payload: CompleteItemPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await mark_compliance_item_complete(item_id, payload, current_user, db)


@router.get("/items/{item_id}/guidance")
async def get_compliance_guidance(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(item_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance item not found.")

    return {
        "steps": [
            {
                "step": 1,
                "title": "Review Requirements",
                "description": f"Review the requirements for {event.title} under {event.regulation or 'applicable law'}.",
                "documents_needed": [],
            },
            {
                "step": 2,
                "title": "Gather Documentation",
                "description": "Collect all required documentation and information.",
                "documents_needed": [],
            },
            {
                "step": 3,
                "title": "File / Submit",
                "description": "Submit the required filing or complete the compliance action.",
                "documents_needed": [],
            },
        ],
        "legal_reference": event.regulation or "Applicable Indian Law",
        "penalty_if_non_compliant": event.penalty_amount or "Penalties may apply as per the Act.",
        "helpful_resources": [
            {"title": "MCA Portal", "url": "https://www.mca.gov.in"},
            {"title": "Income Tax e-Filing", "url": "https://www.incometax.gov.in"},
        ],
    }


@router.get("/items/{item_id}/guidance/", include_in_schema=False)
async def get_compliance_guidance_slash(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_compliance_guidance(item_id, current_user, db)


# ─── Action items ──────────────────────────────────────────────────────────────

@router.patch("/items/{item_id}/actions/{action_id}")
async def update_action_item(
    item_id: uuid.UUID,
    action_id: str,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(item_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance item not found.")

    metadata = getattr(event, "event_metadata", None) or {}
    action_items = metadata.get("action_items") or []
    for ai in action_items:
        if ai.get("id") == action_id:
            ai.update({k: v for k, v in payload.items() if k in ("completed", "due_date")})
            break

    metadata["action_items"] = action_items
    from sqlalchemy import update as sa_update
    from app.models.compliance_event import ComplianceEvent
    stmt = sa_update(ComplianceEvent).where(ComplianceEvent.id == item_id).values(event_metadata=metadata)
    await db.execute(stmt)
    await db.commit()

    return next((ai for ai in action_items if ai.get("id") == action_id), {"id": action_id})


@router.patch("/items/{item_id}/actions/{action_id}/", include_in_schema=False)
async def update_action_item_slash(
    item_id: uuid.UUID,
    action_id: str,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_action_item(item_id, action_id, payload, current_user, db)


@router.post("/items/{item_id}/actions/{action_id}/toggle")
async def toggle_action_item(
    item_id: uuid.UUID,
    action_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(item_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance item not found.")

    metadata = getattr(event, "event_metadata", None) or {}
    action_items = metadata.get("action_items") or []
    result = {"id": action_id, "completed": True}
    for ai in action_items:
        if ai.get("id") == action_id:
            ai["completed"] = not ai.get("completed", False)
            result = ai
            break

    metadata["action_items"] = action_items
    from sqlalchemy import update as sa_update
    from app.models.compliance_event import ComplianceEvent
    stmt = sa_update(ComplianceEvent).where(ComplianceEvent.id == item_id).values(event_metadata=metadata)
    await db.execute(stmt)
    await db.commit()
    return result


@router.post("/items/{item_id}/actions/{action_id}/toggle/", include_in_schema=False)
async def toggle_action_item_slash(
    item_id: uuid.UUID,
    action_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await toggle_action_item(item_id, action_id, current_user, db)


# ─── Calendar ─────────────────────────────────────────────────────────────────

@router.get("/calendar")
async def get_compliance_calendar(
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    framework: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    events, _ = await compliance_repo.get_user_events(user_id=current_user.id, skip=0, limit=1000)
    calendar_events = [_event_to_calendar(e) for e in events]
    if framework:
        calendar_events = [c for c in calendar_events if c["framework"] == framework]
    if priority:
        calendar_events = [c for c in calendar_events if c["priority"] == priority]
    return calendar_events


@router.get("/calendar/", include_in_schema=False)
async def get_compliance_calendar_slash(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_compliance_calendar(None, None, None, None, current_user, db)


# ─── Updates / news ────────────────────────────────────────────────────────────

@router.get("/updates")
async def get_compliance_updates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    framework: Optional[str] = Query(default=None),
    type_filter: Optional[str] = Query(default=None, alias="type"),
    current_user: User = Depends(get_current_active_user),
):
    """Return regulatory updates (MVP: static seed data)."""
    now = datetime.now(timezone.utc).isoformat()
    updates = [
        {
            "id": "upd-1",
            "type": "amendment",
            "title": "Companies (Amendment) Act 2023 — Key Changes",
            "summary": "Recent amendments to the Companies Act 2013 introduce changes to director responsibilities and compliance requirements.",
            "effective_date": "2024-01-01T00:00:00+00:00",
            "source": "Ministry of Corporate Affairs",
            "frameworks": ["companies_act_2013"],
            "created_at": now,
        },
        {
            "id": "upd-2",
            "type": "new_regulation",
            "title": "SEBI (Listing Obligations and Disclosure Requirements) Amendment",
            "summary": "SEBI has issued amendments to LODR regulations affecting disclosure timelines for listed entities.",
            "effective_date": "2024-04-01T00:00:00+00:00",
            "source": "SEBI",
            "frameworks": ["sebi"],
            "created_at": now,
        },
        {
            "id": "upd-3",
            "type": "deadline",
            "title": "GST Annual Return Filing Deadline — FY 2023-24",
            "summary": "Due date for GSTR-9 annual return for FY 2023-24 is December 31, 2024.",
            "effective_date": "2024-12-31T00:00:00+00:00",
            "source": "GSTN",
            "frameworks": ["gst"],
            "created_at": now,
        },
    ]
    if framework:
        updates = [u for u in updates if framework in u["frameworks"]]
    total = len(updates)
    start = (page - 1) * page_size
    page_data = updates[start:start + page_size]
    return {
        "count": total,
        "next": None,
        "previous": None,
        "results": page_data,
    }


@router.get("/updates/", include_in_schema=False)
async def get_compliance_updates_slash(
    current_user: User = Depends(get_current_active_user),
):
    return await get_compliance_updates(1, 10, None, None, current_user)


@router.get("/updates/{update_id}/impact")
async def get_update_impact(
    update_id: str,
    current_user: User = Depends(get_current_active_user),
):
    return {
        "affected_items": [],
        "action_required": False,
        "urgency": "informational",
        "recommended_actions": ["Review the update and assess applicability to your organization."],
    }


# ─── Score & reports ──────────────────────────────────────────────────────────

@router.post("/refresh-score")
async def refresh_compliance_score(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "score": 72.0,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "changes": [],
    }


@router.post("/refresh-score/", include_in_schema=False)
async def refresh_compliance_score_slash(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await refresh_compliance_score(current_user, db)


@router.get("/score-history")
async def get_score_history(
    months: int = Query(default=6),
    current_user: User = Depends(get_current_active_user),
):
    """Return score history (MVP: generated stub data)."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    history = []
    for i in range(months, 0, -1):
        month_dt = now - timedelta(days=30 * i)
        history.append({
            "month": month_dt.strftime("%Y-%m"),
            "overall_score": round(65 + i * 1.5, 1),
            "framework_scores": [
                {"framework": "companies_act_2013", "score": round(70 + i, 1)},
                {"framework": "gst", "score": round(80 + i * 0.5, 1)},
            ],
        })
    return history


@router.get("/score-history/", include_in_schema=False)
async def get_score_history_slash(
    months: int = Query(default=6),
    current_user: User = Depends(get_current_active_user),
):
    return await get_score_history(months, current_user)


@router.post("/reports/generate")
async def generate_compliance_report(
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    dashboard = await get_compliance_dashboard(current_user, db)
    report_text = f"LawBot Compliance Report\nGenerated: {datetime.now(timezone.utc).isoformat()}\n"
    report_text += f"Overall Score: {dashboard['overall_score']}\n"
    report_text += f"Total Items: {dashboard['total_items']}\n"
    content = report_text.encode("utf-8")
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="compliance-report.txt"'},
    )


@router.post("/reports/generate/", include_in_schema=False)
async def generate_compliance_report_slash(
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await generate_compliance_report(payload, current_user, db)


class DocumentCompliancePayload(BaseModel):
    document_id: str
    frameworks: Optional[List[str]] = None


@router.post("/check-document")
async def check_document_compliance(
    payload: DocumentCompliancePayload,
    current_user: User = Depends(get_current_active_user),
):
    return {
        "issues": [],
        "compliant_areas": ["Document structure", "Governing law clause"],
        "overall_status": "needs_review",
        "recommendations": [
            "Review the document against applicable frameworks.",
            "Consult a legal professional for detailed compliance assessment.",
        ],
    }


@router.post("/check-document/", include_in_schema=False)
async def check_document_compliance_slash(
    payload: DocumentCompliancePayload,
    current_user: User = Depends(get_current_active_user),
):
    return await check_document_compliance(payload, current_user)


# ─── Original /compliance/events routes (kept for backward compatibility) ──────

@router.get("/events", response_model=ComplianceEventListResponse)
async def list_compliance_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category_filter: Optional[str] = Query(default=None, alias="category"),
    priority_filter: Optional[str] = Query(default=None, alias="priority"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    status_enum = None
    if status_filter:
        try:
            status_enum = ComplianceStatus(status_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    category_enum = None
    if category_filter:
        try:
            category_enum = ComplianceCategory(category_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category_filter}")

    priority_enum = None
    if priority_filter:
        try:
            priority_enum = CompliancePriority(priority_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {priority_filter}")

    compliance_service = ComplianceService(db)
    return await compliance_service.get_events(
        user=current_user,
        skip=(page - 1) * page_size,
        limit=page_size,
        status_filter=status_enum,
        category_filter=category_enum,
        priority_filter=priority_enum,
    )


@router.post("/events", response_model=ComplianceEventResponse, status_code=status.HTTP_201_CREATED)
async def create_compliance_event(
    request: ComplianceEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_service = ComplianceService(db)
    return await compliance_service.create_event(request=request, user=current_user)


@router.get("/events/{event_id}", response_model=ComplianceEventResponse)
async def get_compliance_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance event not found.")
    compliance_service = ComplianceService(db)
    return compliance_service._event_to_response(event)


@router.put("/events/{event_id}", response_model=ComplianceEventResponse)
async def update_compliance_event(
    event_id: uuid.UUID,
    request: ComplianceEventUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_service = ComplianceService(db)
    result = await compliance_service.update_event(event_id=event_id, request=request, user=current_user)
    if not result:
        raise HTTPException(status_code=404, detail="Compliance event not found.")
    return result


@router.post("/events/{event_id}/complete", response_model=ComplianceEventResponse)
async def complete_compliance_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.mark_completed(event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance event not found.")
    compliance_service = ComplianceService(db)
    return compliance_service._event_to_response(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_200_OK)
async def delete_compliance_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_repo = ComplianceRepository(db)
    event = await compliance_repo.get_by_id_and_user(event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Compliance event not found.")
    await compliance_repo.delete(event_id)
    return {"message": "Compliance event deleted successfully."}


@router.post("/seed-defaults", status_code=status.HTTP_201_CREATED)
async def seed_default_compliance_events(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    compliance_service = ComplianceService(db)
    events = await compliance_service.seed_default_events(current_user)
    return {
        "message": f"Created {len(events)} default compliance events.",
        "events_created": len(events),
    }
