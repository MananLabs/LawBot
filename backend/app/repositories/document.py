"""
Document repository for database operations on Document model.
"""
import uuid
from typing import Optional, List, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus, DocumentType
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Repository for Document model CRUD operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Document, db)

    async def get_user_documents(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[DocumentStatus] = None,
    ) -> Tuple[List[Document], int]:
        """Get paginated documents for a specific user."""
        query = select(Document).where(
            Document.user_id == user_id,
            Document.status != DocumentStatus.DELETED,
        )

        if status_filter:
            query = query.where(Document.status == status_filter)

        # Get total count
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Document.created_at.desc())
        result = await self.db.execute(query)
        documents = list(result.scalars().all())

        return documents, total

    async def get_by_id_and_user(
        self, document_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[Document]:
        """Get a document by ID ensuring it belongs to the specified user."""
        result = await self.db.execute(
            select(Document).where(
                Document.id == document_id,
                Document.user_id == user_id,
                Document.status != DocumentStatus.DELETED,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_content_hash(
        self, content_hash: str, user_id: uuid.UUID
    ) -> Optional[Document]:
        """Check if a document with the same content already exists for a user."""
        result = await self.db.execute(
            select(Document).where(
                Document.content_hash == content_hash,
                Document.user_id == user_id,
                Document.status != DocumentStatus.DELETED,
            )
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        document_id: uuid.UUID,
        status: DocumentStatus,
        error_message: Optional[str] = None,
    ) -> Optional[Document]:
        """Update document processing status."""
        update_data = {"status": status}
        if error_message:
            update_data["error_message"] = error_message
        return await self.update(document_id, update_data)

    async def update_processing_result(
        self,
        document_id: uuid.UUID,
        chunk_count: int,
        page_count: int,
        qdrant_collection: Optional[str] = None,
        content_hash: Optional[str] = None,
    ) -> Optional[Document]:
        """Update document after successful processing."""
        update_data = {
            "status": DocumentStatus.PROCESSED,
            "chunk_count": chunk_count,
            "page_count": page_count,
        }
        if qdrant_collection:
            update_data["qdrant_collection"] = qdrant_collection
        if content_hash:
            update_data["content_hash"] = content_hash
        return await self.update(document_id, update_data)

    async def soft_delete(self, document_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Soft delete a document (mark as deleted)."""
        doc = await self.get_by_id_and_user(document_id, user_id)
        if not doc:
            return False
        await self.update(document_id, {"status": DocumentStatus.DELETED})
        return True

    async def get_processed_documents(
        self, user_id: uuid.UUID
    ) -> List[Document]:
        """Get all successfully processed documents for a user."""
        result = await self.db.execute(
            select(Document).where(
                Document.user_id == user_id,
                Document.status == DocumentStatus.PROCESSED,
            ).order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())
