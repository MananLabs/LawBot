"""
Document management routes.

Provides both the original backend schema responses AND the frontend-compatible
PaginatedResponse / Document shapes via conversion helpers.
"""
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.services.document import DocumentService
from app.repositories.document import DocumentRepository

router = APIRouter(prefix="/documents", tags=["Documents"])


# ─── Frontend-compatible response helpers ─────────────────────────────────────

_STATUS_MAP = {
    "pending": "processing",
    "processing": "processing",
    "processed": "ready",
    "failed": "error",
    "deleted": "archived",
}

_MIME_MAP = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "txt": "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
}


def _doc_to_frontend(doc) -> dict:
    """Convert Document ORM → frontend Document shape."""
    metadata = getattr(doc, "doc_metadata", None) or {}
    file_type = doc.file_type.value if hasattr(doc.file_type, "value") else str(doc.file_type)
    raw_status = doc.status.value if hasattr(doc.status, "value") else str(doc.status)
    fe_status = _STATUS_MAP.get(raw_status, "processing")

    return {
        "id": str(doc.id),
        "name": metadata.get("name") or doc.original_filename,
        "original_filename": doc.original_filename,
        "type": metadata.get("type") or "other",
        "status": fe_status,
        "file_size": doc.file_size,
        "mime_type": _MIME_MAP.get(file_type, "application/octet-stream"),
        "page_count": doc.page_count or None,
        "language": metadata.get("language") or "en",
        "parties": metadata.get("parties") or [],
        "summary": metadata.get("summary") or None,
        "key_clauses": metadata.get("key_clauses") or [],
        "jurisdiction": metadata.get("jurisdiction") or None,
        "effective_date": metadata.get("effective_date") or None,
        "expiry_date": metadata.get("expiry_date") or None,
        "tags": metadata.get("tags") or [],
        "is_analyzed": bool(metadata.get("last_analysis_id")),
        "upload_url": None,
        "created_at": doc.created_at.isoformat(),
        "updated_at": doc.updated_at.isoformat(),
    }


def _paginated_docs(results: list, total: int, page: int, page_size: int) -> dict:
    has_next = (page * page_size) < total
    has_prev = page > 1
    return {
        "count": total,
        "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
        "previous": f"?page={page - 1}&page_size={page_size}" if has_prev else None,
        "results": results,
    }


# ─── Upload ───────────────────────────────────────────────────────────────────

async def _do_upload(file: UploadFile, type: Optional[str], name: Optional[str],
                     tags: Optional[str], current_user: User, db: AsyncSession) -> dict:
    from app.models.document import DocumentStatus
    doc_service = DocumentService(db)
    document = await doc_service.upload_document(file=file, user=current_user)

    metadata_update: dict = {}
    if type:
        metadata_update["type"] = type
    if name:
        metadata_update["name"] = name
    if tags:
        import json as _json
        try:
            metadata_update["tags"] = _json.loads(tags)
        except Exception:
            metadata_update["tags"] = [t.strip() for t in tags.split(",")]

    if metadata_update:
        doc_repo = DocumentRepository(db)
        existing = document.doc_metadata or {}
        existing.update(metadata_update)
        await doc_repo.update(document.id, {"doc_metadata": existing})
        document.doc_metadata = existing

    return _doc_to_frontend(document)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    type: Optional[str] = None,
    name: Optional[str] = None,
    tags: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_upload(file, type, name, tags, current_user, db)


@router.post("/upload/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def upload_document_slash(
    file: UploadFile = File(...),
    type: Optional[str] = None,
    name: Optional[str] = None,
    tags: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_upload(file, type, name, tags, current_user, db)


# ─── List ─────────────────────────────────────────────────────────────────────

async def _do_list(page: int, page_size: int, search: Optional[str],
                   type_filter: Optional[str], status_filter: Optional[str],
                   current_user: User, db: AsyncSession) -> dict:
    from app.models.document import DocumentStatus
    doc_repo = DocumentRepository(db)
    skip = (page - 1) * page_size

    doc_status = None
    if status_filter:
        status_backend = {"processing": "processing", "ready": "processed",
                          "error": "failed", "archived": "deleted"}.get(status_filter, status_filter)
        try:
            doc_status = DocumentStatus(status_backend)
        except ValueError:
            pass

    documents, total = await doc_repo.get_user_documents(
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        status_filter=doc_status,
    )

    results = [_doc_to_frontend(d) for d in documents]

    if search:
        search_lower = search.lower()
        results = [
            r for r in results
            if search_lower in r["name"].lower()
            or search_lower in r["original_filename"].lower()
        ]

    if type_filter:
        results = [r for r in results if r["type"] == type_filter]

    return _paginated_docs(results, total, page, page_size)


@router.get("")
async def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    ordering: Optional[str] = Query(default=None),
    tags: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_list(page, page_size, search, type, status_filter, current_user, db)


@router.get("/", include_in_schema=False)
async def list_documents_slash(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_list(page, page_size, search, type, status_filter, current_user, db)


# ─── Special-path endpoints must come BEFORE /{document_id} ──────────────────

@router.get("/storage")
async def get_storage_usage(current_user: User = Depends(get_current_active_user),
                             db: AsyncSession = Depends(get_db)):
    doc_repo = DocumentRepository(db)
    _, total = await doc_repo.get_user_documents(user_id=current_user.id, skip=0, limit=10000)
    return {
        "used_bytes": 0,
        "limit_bytes": 1073741824,
        "document_count": total,
        "breakdown": [],
    }


@router.get("/storage/", include_in_schema=False)
async def get_storage_usage_slash(current_user: User = Depends(get_current_active_user),
                                   db: AsyncSession = Depends(get_db)):
    return await get_storage_usage(current_user, db)


@router.get("/tags")
async def get_document_tags(current_user: User = Depends(get_current_active_user),
                             db: AsyncSession = Depends(get_db)):
    doc_repo = DocumentRepository(db)
    documents, _ = await doc_repo.get_user_documents(user_id=current_user.id, skip=0, limit=1000)
    tags = set()
    for doc in documents:
        metadata = getattr(doc, "doc_metadata", None) or {}
        for tag in (metadata.get("tags") or []):
            tags.add(tag)
    return sorted(tags)


@router.get("/tags/", include_in_schema=False)
async def get_document_tags_slash(current_user: User = Depends(get_current_active_user),
                                   db: AsyncSession = Depends(get_db)):
    return await get_document_tags(current_user, db)


class UploadUrlRequest(BaseModel):
    filename: str
    file_size: int
    mime_type: str


@router.post("/upload-url")
async def get_upload_url(
    payload: UploadUrlRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Return pre-signed upload URL (MVP: returns direct upload endpoint instead)."""
    placeholder_id = str(uuid.uuid4())
    return {
        "document": None,
        "upload_url": "/api/v1/documents/upload/",
        "presigned_fields": {},
        "document_id": placeholder_id,
    }


@router.post("/upload-url/", include_in_schema=False)
async def get_upload_url_slash(
    payload: UploadUrlRequest,
    current_user: User = Depends(get_current_active_user),
):
    return await get_upload_url(payload, current_user)


class SearchPayload(BaseModel):
    query: str
    type: Optional[str] = None
    tags: Optional[List[str]] = None


@router.post("/search")
async def search_documents(
    payload: SearchPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    documents, _ = await doc_repo.get_user_documents(user_id=current_user.id, skip=0, limit=1000)
    query = payload.query.lower()
    results = []
    for doc in documents:
        metadata = getattr(doc, "doc_metadata", None) or {}
        name = metadata.get("name") or doc.original_filename
        if query in name.lower() or (doc.extracted_text and query in doc.extracted_text.lower()):
            results.append(_doc_to_frontend(doc))
    return results


@router.post("/search/", include_in_schema=False)
async def search_documents_slash(
    payload: SearchPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await search_documents(payload, current_user, db)


# ─── Single document ──────────────────────────────────────────────────────────

@router.get("/{document_id}")
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return _doc_to_frontend(document)


@router.get("/{document_id}/", include_in_schema=False)
async def get_document_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_document(document_id, current_user, db)


@router.patch("/{document_id}")
async def update_document(
    document_id: uuid.UUID,
    updates: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    metadata = getattr(document, "doc_metadata", None) or {}
    if "name" in updates:
        metadata["name"] = updates["name"]
    if "type" in updates:
        metadata["type"] = updates["type"]
    if "tags" in updates:
        metadata["tags"] = updates["tags"]
    if "jurisdiction" in updates:
        metadata["jurisdiction"] = updates["jurisdiction"]

    document = await doc_repo.update(document_id, {"doc_metadata": metadata})
    return _doc_to_frontend(document)


@router.patch("/{document_id}/", include_in_schema=False)
async def update_document_slash(
    document_id: uuid.UUID,
    updates: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_document(document_id, updates, current_user, db)


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    raw_status = document.status.value if hasattr(document.status, "value") else str(document.status)
    return {
        "status": _STATUS_MAP.get(raw_status, "processing"),
        "progress": 100 if raw_status == "processed" else 50,
        "message": "Processing complete." if raw_status == "processed" else "Processing...",
    }


@router.get("/{document_id}/status/", include_in_schema=False)
async def get_document_status_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_document_status(document_id, current_user, db)


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    text = document.extracted_text or ""
    return {"text": text, "pages": [{"page": 1, "text": text}]}


@router.get("/{document_id}/content/", include_in_schema=False)
async def get_document_content_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_document_content(document_id, current_user, db)


@router.get("/{document_id}/download")
async def get_download_url(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    from datetime import datetime, timezone, timedelta
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    return {
        "url": f"/api/v1/documents/{document_id}/download/file/",
        "expires_at": expires,
    }


@router.get("/{document_id}/download/", include_in_schema=False)
async def get_download_url_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_download_url(document_id, current_user, db)


@router.get("/{document_id}/preview")
async def get_preview_url(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    from datetime import datetime, timezone, timedelta
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    return {
        "url": f"/api/v1/documents/{document_id}/download/file/",
        "expires_at": expires,
    }


@router.get("/{document_id}/preview/", include_in_schema=False)
async def get_preview_url_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_preview_url(document_id, current_user, db)


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_service = DocumentService(db)
    success = await doc_service.delete_document(document_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted successfully."}


@router.delete("/{document_id}/", status_code=status.HTTP_200_OK, include_in_schema=False)
async def delete_document_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await delete_document(document_id, current_user, db)


@router.post("/{document_id}/archive")
async def archive_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.document import DocumentStatus
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    updated = await doc_repo.update_status(document_id, DocumentStatus.DELETED)
    document.status = DocumentStatus.DELETED
    return _doc_to_frontend(document)


@router.post("/{document_id}/archive/", include_in_schema=False)
async def archive_document_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await archive_document(document_id, current_user, db)


@router.post("/{document_id}/restore")
async def restore_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.document import DocumentStatus, Document as DocModel
    from sqlalchemy import select as sa_select
    # Must find even DELETED documents
    result = await db.execute(
        sa_select(DocModel).where(
            DocModel.id == document_id,
            DocModel.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc_repo = DocumentRepository(db)
    await doc_repo.update_status(document_id, DocumentStatus.PROCESSED)
    document.status = DocumentStatus.PROCESSED
    return _doc_to_frontend(document)


@router.post("/{document_id}/restore/", include_in_schema=False)
async def restore_document_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await restore_document(document_id, current_user, db)


class TagsPayload(BaseModel):
    tags: List[str]


@router.post("/{document_id}/tags")
async def add_document_tags(
    document_id: uuid.UUID,
    payload: TagsPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    metadata = getattr(document, "doc_metadata", None) or {}
    existing_tags = set(metadata.get("tags") or [])
    existing_tags.update(payload.tags)
    metadata["tags"] = list(existing_tags)
    await doc_repo.update(document_id, {"doc_metadata": metadata})
    document.doc_metadata = metadata
    return _doc_to_frontend(document)


@router.post("/{document_id}/tags/", include_in_schema=False)
async def add_document_tags_slash(
    document_id: uuid.UUID,
    payload: TagsPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await add_document_tags(document_id, payload, current_user, db)


@router.post("/{document_id}/tags/remove")
async def remove_document_tags(
    document_id: uuid.UUID,
    payload: TagsPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    metadata = getattr(document, "doc_metadata", None) or {}
    existing_tags = set(metadata.get("tags") or [])
    existing_tags -= set(payload.tags)
    metadata["tags"] = list(existing_tags)
    await doc_repo.update(document_id, {"doc_metadata": metadata})
    document.doc_metadata = metadata
    return _doc_to_frontend(document)


@router.post("/{document_id}/tags/remove/", include_in_schema=False)
async def remove_document_tags_slash(
    document_id: uuid.UUID,
    payload: TagsPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await remove_document_tags(document_id, payload, current_user, db)


@router.post("/{document_id}/confirm-upload")
async def confirm_upload(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _doc_to_frontend(document)


@router.post("/{document_id}/confirm-upload/", include_in_schema=False)
async def confirm_upload_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await confirm_upload(document_id, current_user, db)


@router.post("/{document_id}/reprocess", status_code=status.HTTP_202_ACCEPTED)
async def reprocess_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.document import DocumentStatus
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    raw_status = document.status.value if hasattr(document.status, "value") else str(document.status)
    if raw_status not in ("failed", "pending"):
        raise HTTPException(
            status_code=400,
            detail=f"Document cannot be reprocessed in current status: {raw_status}",
        )
    await doc_repo.update_status(document_id, DocumentStatus.PENDING)
    doc_service = DocumentService(db)
    try:
        from app.tasks.document_tasks import process_document_task
        process_document_task.delay(str(document_id))
    except ImportError:
        await doc_service.process_document(str(document_id))

    return _doc_to_frontend(document)


@router.post("/{document_id}/reprocess/", status_code=status.HTTP_202_ACCEPTED, include_in_schema=False)
async def reprocess_document_slash(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await reprocess_document(document_id, current_user, db)
