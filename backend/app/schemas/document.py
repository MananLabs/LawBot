"""
Pydantic schemas for document upload and management.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel

from app.models.document import DocumentStatus, DocumentType


class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_type: DocumentType
    file_size: int
    status: DocumentStatus
    message: str = "Document uploaded successfully. Processing will begin shortly."

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    original_filename: str
    file_type: DocumentType
    file_size: int
    status: DocumentStatus
    chunk_count: int
    page_count: int
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentProcessingStatus(BaseModel):
    id: uuid.UUID
    status: DocumentStatus
    chunk_count: int
    page_count: int
    error_message: Optional[str] = None
    progress_percentage: Optional[float] = None

    model_config = {"from_attributes": True}
