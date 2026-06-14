"""
Export background tasks: PDF/DOCX generation for legal documents.
"""
import asyncio
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
    name="app.tasks.export_tasks.export_generated_document",
    bind=True,
    max_retries=2,
    queue="exports",
    time_limit=180,
)
def export_generated_document(
    self,
    document_id: str,
    format: str = "docx",
    user_id: str = "",
) -> dict:
    """
    Render a GeneratedDocument to PDF or DOCX and store the file.
    Updates generated_document.export_url on completion.
    """
    logger.info("Exporting generated document", document_id=document_id, format=format)

    async def _export():
        from app.database import AsyncSessionLocal
        from app.services.export_service import ExportService

        async with AsyncSessionLocal() as db:
            service = ExportService(db)
            try:
                file_path, filename, download_url = await service.export_generated_document(
                    document_id=document_id,
                    format=format,
                )
                logger.info("Export completed", document_id=document_id, filename=filename)
                return {
                    "status": "completed",
                    "document_id": document_id,
                    "filename": filename,
                    "download_url": download_url,
                    "format": format,
                }
            except Exception as exc:
                logger.error("Export failed", document_id=document_id, error=str(exc))
                raise self.retry(exc=exc)

    return _run_async(_export())


@celery_app.task(
    name="app.tasks.export_tasks.batch_export_documents",
    bind=True,
    queue="exports",
    time_limit=600,
)
def batch_export_documents(
    self,
    document_ids: list,
    format: str = "docx",
    user_id: str = "",
) -> dict:
    """Export multiple documents; returns list of results."""
    results = []
    for doc_id in document_ids:
        try:
            task = export_generated_document.apply(args=[doc_id, format, user_id])
            results.append({"document_id": doc_id, "task_id": task.id, "status": "queued"})
        except Exception as exc:
            results.append({"document_id": doc_id, "status": "failed", "error": str(exc)})
    return {"results": results, "total": len(results)}
