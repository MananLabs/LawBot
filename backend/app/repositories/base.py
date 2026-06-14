"""
Generic async CRUD repository base class.
"""
import uuid
from typing import Generic, TypeVar, Type, Optional, List, Any, Dict, Sequence

from sqlalchemy import select, delete, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """
    Generic async CRUD repository.
    Provides standard database operations for any SQLAlchemy model.
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    async def get_by_id(self, record_id: uuid.UUID) -> Optional[ModelType]:
        """Fetch a single record by its primary key."""
        result = await self.db.execute(
            select(self.model).where(self.model.id == record_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[ModelType]:
        """Fetch all records with optional pagination and filters."""
        query = select(self.model)

        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)

        query = query.offset(skip).limit(limit).order_by(self.model.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters."""
        query = select(func.count()).select_from(self.model)

        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, obj_data: Dict[str, Any]) -> ModelType:
        """Create a new record."""
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        record_id: uuid.UUID,
        obj_data: Dict[str, Any],
    ) -> Optional[ModelType]:
        """Update an existing record by ID."""
        db_obj = await self.get_by_id(record_id)
        if not db_obj:
            return None

        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, record_id: uuid.UUID) -> bool:
        """Delete a record by ID. Returns True if deleted, False if not found."""
        db_obj = await self.get_by_id(record_id)
        if not db_obj:
            return False

        await self.db.delete(db_obj)
        await self.db.flush()
        return True

    async def bulk_create(self, objects: List[Dict[str, Any]]) -> List[ModelType]:
        """Create multiple records at once."""
        db_objects = [self.model(**obj_data) for obj_data in objects]
        self.db.add_all(db_objects)
        await self.db.flush()
        for obj in db_objects:
            await self.db.refresh(obj)
        return db_objects

    async def exists(self, filters: Dict[str, Any]) -> bool:
        """Check if a record exists with the given filters."""
        query = select(func.count()).select_from(self.model)
        for field, value in filters.items():
            if hasattr(self.model, field):
                query = query.where(getattr(self.model, field) == value)
        result = await self.db.execute(query)
        return result.scalar_one() > 0
