"""
Document management routes: upload, list, retrieve, delete.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
    DocumentProcessingStatus,
)
from app.services.document import DocumentService
from app.repositories.document import DocumentRepository

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a legal document for analysis",
)
async def upload_document(
    file: UploadFile = File(..., description="Legal document (PDF, DOCX, DOC, TXT, XLSX)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a legal document for AI analysis.

    Supported formats: PDF, DOCX, DOC, TXT, XLSX, XLS
    Maximum file size: 50MB

    After upload, the document is:
    1. Validated and stored
    2. Text is extracted
    3. Content is chunked and embedded with BGE-M3
    4. Stored in Qdrant for semantic search
    """
    doc_service = DocumentService(db)
    document = await doc_service.upload_document(file=file, user=current_user)

    return DocumentUploadResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        file_type=document.file_type,
        file_size=document.file_size,
        status=document.status,
        message="Document uploaded successfully. Processing will begin shortly.",
    )


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List user's uploaded documents",
)
async def list_documents(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by status: pending/processing/processed/failed",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of the current user's uploaded documents.
    """
    from app.models.document import DocumentStatus

    doc_repo = DocumentRepository(db)
    skip = (page - 1) * page_size

    doc_status = None
    if status_filter:
        try:
            doc_status = DocumentStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}",
            )

    documents, total = await doc_repo.get_user_documents(
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        status_filter=doc_status,
    )

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(doc) for doc in documents],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details",
)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific document.
    """
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return DocumentResponse.model_validate(document)


@router.get(
    "/{document_id}/status",
    response_model=DocumentProcessingStatus,
    summary="Check document processing status",
)
async def get_document_status(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check the processing status of an uploaded document.
    Poll this endpoint to know when the document is ready for analysis.
    """
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return DocumentProcessingStatus(
        id=document.id,
        status=document.status,
        chunk_count=document.chunk_count,
        page_count=document.page_count,
        error_message=document.error_message,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a document",
)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a document and remove its embeddings from Qdrant.
    This operation is irreversible.
    """
    doc_service = DocumentService(db)
    success = await doc_service.delete_document(document_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return {"message": "Document deleted successfully."}


@router.post(
    "/{document_id}/reprocess",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Reprocess a failed document",
)
async def reprocess_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger reprocessing of a failed document.
    Useful if the initial processing failed due to a temporary error.
    """
    from app.models.document import DocumentStatus
    doc_repo = DocumentRepository(db)
    document = await doc_repo.get_by_id_and_user(document_id, current_user.id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    if document.status not in (DocumentStatus.FAILED, DocumentStatus.PENDING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document cannot be reprocessed in its current status: {document.status.value}",
        )

    # Reset status and trigger processing
    await doc_repo.update_status(document_id, DocumentStatus.PENDING)

    doc_service = DocumentService(db)
    try:
        from app.tasks.document_tasks import process_document_task
        process_document_task.delay(str(document_id))
    except ImportError:
        await doc_service.process_document(str(document_id))

    return {"message": "Document reprocessing initiated.", "document_id": str(document_id)}
