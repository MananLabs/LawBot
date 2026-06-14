"""
Document processing background tasks:
- Text extraction (PDF/DOCX)
- Chunking
- BGE-M3 embedding
- Qdrant storage
"""
import asyncio
import os
from pathlib import Path
from typing import Optional

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


def _run_async(coro):
    """Run an async coroutine in a Celery task (sync context)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    name="app.tasks.document_tasks.process_document",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="documents",
)
def process_document(self, document_id: str, user_id: str) -> dict:
    """
    Full document processing pipeline:
    1. Extract text from PDF/DOCX
    2. Clean and preprocess text
    3. Semantic chunking
    4. Generate BGE-M3 embeddings
    5. Store in Qdrant
    6. Update document status in DB
    """
    logger.info("Processing document", document_id=document_id, task_id=self.request.id)

    async def _process():
        from app.database import AsyncSessionLocal
        from app.services.document import DocumentService
        from app.models.document import DocumentStatus

        async with AsyncSessionLocal() as db:
            service = DocumentService(db)
            try:
                # Update status to processing
                await service.doc_repo.update(
                    document_id,
                    {"status": DocumentStatus.PROCESSING, "processing_started_at": __import__("datetime").datetime.utcnow()},
                )
                await db.commit()

                # Run the full processing pipeline
                await service.process_document(document_id)

                logger.info("Document processed successfully", document_id=document_id)
                return {"status": "completed", "document_id": document_id}

            except Exception as exc:
                logger.error("Document processing failed", document_id=document_id, error=str(exc))
                try:
                    await service.doc_repo.update(
                        document_id,
                        {"status": DocumentStatus.FAILED, "processing_error": str(exc)},
                    )
                    await db.commit()
                except Exception:
                    pass
                raise self.retry(exc=exc)

    return _run_async(_process())


@celery_app.task(
    name="app.tasks.document_tasks.reprocess_document",
    bind=True,
    max_retries=2,
    queue="documents",
)
def reprocess_document(self, document_id: str) -> dict:
    """Re-run embedding pipeline for an already-extracted document."""
    logger.info("Reprocessing document", document_id=document_id)

    async def _reprocess():
        from app.database import AsyncSessionLocal
        from app.services.document import DocumentService

        async with AsyncSessionLocal() as db:
            service = DocumentService(db)
            try:
                await service.reprocess_embeddings(document_id)
                return {"status": "completed", "document_id": document_id}
            except Exception as exc:
                logger.error("Reprocessing failed", document_id=document_id, error=str(exc))
                raise self.retry(exc=exc)

    return _run_async(_reprocess())


@celery_app.task(
    name="app.tasks.document_tasks.delete_document_vectors",
    queue="documents",
)
def delete_document_vectors(document_id: str) -> dict:
    """Remove a document's vectors from Qdrant after deletion."""
    logger.info("Deleting document vectors", document_id=document_id)

    async def _delete():
        from app.services.rag import RAGService

        rag = RAGService()
        await rag.delete_document_vectors(document_id)
        return {"status": "deleted", "document_id": document_id}

    return _run_async(_delete())


@celery_app.task(
    name="app.tasks.document_tasks.cleanup_expired_temp_files",
    queue="maintenance",
)
def cleanup_expired_temp_files() -> dict:
    """Periodic task: remove temporary files older than 24 hours."""
    upload_dir = Path(os.environ.get("UPLOAD_DIR", "./uploads")) / "temp"
    if not upload_dir.exists():
        return {"cleaned": 0}

    import time

    cutoff = time.time() - 86400  # 24 hours
    cleaned = 0
    for f in upload_dir.iterdir():
        if f.is_file() and f.stat().st_mtime < cutoff:
            f.unlink(missing_ok=True)
            cleaned += 1

    logger.info("Cleaned temp files", count=cleaned)
    return {"cleaned": cleaned}


@celery_app.task(
    name="app.tasks.document_tasks.process_pending_documents",
    queue="maintenance",
)
def process_pending_documents() -> dict:
    """Periodic task: pick up any documents stuck in PENDING state."""
    async def _pick_up():
        from app.database import AsyncSessionLocal
        from app.repositories.document import DocumentRepository
        from app.models.document import DocumentStatus

        async with AsyncSessionLocal() as db:
            repo = DocumentRepository(db)
            pending = await repo.get_by_status(DocumentStatus.PENDING, limit=10)
            for doc in pending:
                process_document.delay(str(doc.id), str(doc.user_id))
            return {"queued": len(pending)}

    return _run_async(_pick_up())


@celery_app.task(
    name="app.tasks.document_tasks.bulk_upload_documents",
    bind=True,
    queue="documents",
)
def bulk_upload_documents(self, document_ids: list, user_id: str) -> dict:
    """Process multiple document uploads sequentially."""
    results = []
    for doc_id in document_ids:
        try:
            result = process_document.apply(args=[doc_id, user_id])
            results.append({"document_id": doc_id, "status": "queued", "task_id": result.id})
        except Exception as exc:
            results.append({"document_id": doc_id, "status": "failed", "error": str(exc)})
    return {"results": results}
