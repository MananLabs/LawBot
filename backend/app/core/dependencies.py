"""
FastAPI dependency injection providers.
"""
import uuid
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import verify_access_token
from app.models.user import User

# HTTP Bearer scheme for JWT extraction
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    Raises:
        HTTPException 401: If token is missing or invalid
        HTTPException 401: If user not found or inactive
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = verify_access_token(credentials.credentials)
    if not user_id:
        raise credentials_exception

    # Import here to avoid circular imports
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)

    try:
        user = await user_repo.get_by_id(uuid.UUID(user_id))
    except (ValueError, Exception):
        raise credentials_exception

    if not user:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current active user.

    Raises:
        HTTPException 403: If user account is deactivated
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )
    return current_user


async def get_verified_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency to get a verified active user.

    Raises:
        HTTPException 403: If user is not verified
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to access this feature.",
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Optional authentication - returns user if authenticated, None otherwise.
    Useful for endpoints that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None

    user_id = verify_access_token(credentials.credentials)
    if not user_id:
        return None

    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)

    try:
        user = await user_repo.get_by_id(uuid.UUID(user_id))
        if user and user.is_active:
            return user
    except Exception:
        pass

    return None
