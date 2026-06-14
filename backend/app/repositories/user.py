"""
User repository for database operations on User model.
"""
import uuid
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model CRUD operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by email address (case-insensitive)."""
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def get_active_users(
        self, skip: int = 0, limit: int = 100
    ) -> List[User]:
        """Fetch all active users."""
        result = await self.db.execute(
            select(User)
            .where(User.is_active == True)  # noqa: E712
            .offset(skip)
            .limit(limit)
            .order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_user(
        self,
        email: str,
        hashed_password: str,
        full_name: str,
        user_type: str,
        company_name: Optional[str] = None,
        phone_number: Optional[str] = None,
    ) -> User:
        """Create a new user account."""
        return await self.create({
            "email": email.lower().strip(),
            "hashed_password": hashed_password,
            "full_name": full_name.strip(),
            "user_type": user_type,
            "company_name": company_name,
            "phone_number": phone_number,
            "is_active": True,
            "is_verified": False,
        })

    async def update_refresh_token(
        self, user_id: uuid.UUID, refresh_token: Optional[str]
    ) -> Optional[User]:
        """Update the stored refresh token for a user."""
        return await self.update(user_id, {"refresh_token": refresh_token})

    async def verify_user(self, user_id: uuid.UUID) -> Optional[User]:
        """Mark a user as email-verified."""
        return await self.update(user_id, {"is_verified": True})

    async def deactivate_user(self, user_id: uuid.UUID) -> Optional[User]:
        """Deactivate a user account."""
        return await self.update(user_id, {"is_active": False})

    async def email_exists(self, email: str) -> bool:
        """Check if an email is already registered."""
        return await self.exists({"email": email.lower().strip()})

    async def update_password(
        self, user_id: uuid.UUID, hashed_password: str
    ) -> Optional[User]:
        """Update user's hashed password."""
        return await self.update(user_id, {"hashed_password": hashed_password})
