"""
Compliance monitoring background tasks.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    name="app.tasks.compliance_tasks.refresh_compliance_deadlines",
    queue="compliance",
)
def refresh_compliance_deadlines() -> dict:
    """
    Periodic task: re-calculate upcoming deadlines,
    flag overdue items, and send reminder notifications.
    """
    async def _refresh():
        from app.database import AsyncSessionLocal
        from app.services.compliance import ComplianceService

        async with AsyncSessionLocal() as db:
            service = ComplianceService(db)
            result = await service.refresh_all_deadlines()
            logger.info("Compliance deadlines refreshed", **result)
            return result

    return _run_async(_refresh())


@celery_app.task(
    name="app.tasks.compliance_tasks.send_deadline_reminders",
    queue="compliance",
)
def send_deadline_reminders(days_ahead: int = 7) -> dict:
    """
    Send email/in-app reminders for items due within `days_ahead` days.
    """
    async def _send():
        from app.database import AsyncSessionLocal
        from app.services.compliance import ComplianceService

        async with AsyncSessionLocal() as db:
            service = ComplianceService(db)
            sent = await service.send_deadline_reminders(days_ahead=days_ahead)
            logger.info("Deadline reminders sent", count=sent)
            return {"reminders_sent": sent}

    return _run_async(_send())


@celery_app.task(
    name="app.tasks.compliance_tasks.recalculate_compliance_score",
    queue="compliance",
    time_limit=300,
)
def recalculate_compliance_score(organization_id: str) -> dict:
    """Recalculate full compliance score for an organization."""
    async def _recalculate():
        from app.database import AsyncSessionLocal
        from app.services.compliance import ComplianceService

        async with AsyncSessionLocal() as db:
            service = ComplianceService(db)
            score = await service.calculate_compliance_score(organization_id)
            logger.info(
                "Compliance score recalculated",
                organization_id=organization_id,
                score=score,
            )
            return {"organization_id": organization_id, "score": score}

    return _run_async(_recalculate())


@celery_app.task(
    name="app.tasks.compliance_tasks.sync_regulatory_updates",
    queue="compliance",
    time_limit=600,
)
def sync_regulatory_updates() -> dict:
    """
    Fetch latest regulatory updates from MCA, GST, SEBI sources
    and persist them to the database.
    """
    async def _sync():
        from app.database import AsyncSessionLocal
        from app.services.compliance import ComplianceService

        async with AsyncSessionLocal() as db:
            service = ComplianceService(db)
            added = await service.sync_regulatory_updates()
            logger.info("Regulatory updates synced", added=added)
            return {"updates_added": added}

    return _run_async(_sync())


@celery_app.task(
    name="app.tasks.compliance_tasks.generate_compliance_report_async",
    bind=True,
    max_retries=1,
    queue="exports",
    time_limit=300,
)
def generate_compliance_report_async(
    self,
    user_id: str,
    framework: Optional[str],
    format: str = "pdf",
    include_recommendations: bool = True,
) -> dict:
    """Generate a compliance report in the background and store the file."""
    async def _generate():
        from app.database import AsyncSessionLocal
        from app.services.export_service import ExportService

        async with AsyncSessionLocal() as db:
            service = ExportService(db)
            try:
                file_path, filename = await service.export_compliance_report(
                    user_id=user_id,
                    framework=framework,
                    format=format,
                    include_recommendations=include_recommendations,
                )
                return {"file_path": str(file_path), "filename": filename}
            except Exception as exc:
                raise self.retry(exc=exc)

    return _run_async(_generate())
