"""
Authentication service: register, login, token refresh, and user management.
"""
import uuid
from datetime import timedelta
from typing import Optional, Tuple

import structlog
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_token_expiry_seconds,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

logger = structlog.get_logger(__name__)


class AuthService:
    """Service handling user registration, login, and token management."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, request: RegisterRequest) -> Tuple[User, TokenResponse]:
        """
        Register a new user account.

        Args:
            request: Registration data

        Returns:
            Tuple of (User, TokenResponse)

        Raises:
            HTTPException 409: If email already registered
        """
        # Check for existing email
        if await self.user_repo.email_exists(request.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        # Hash password
        hashed_pw = hash_password(request.password)

        # Determine full_name from available fields
        if hasattr(request, 'full_name'):
            full_name = request.full_name
        elif hasattr(request, 'first_name') and hasattr(request, 'last_name'):
            full_name = f"{request.first_name} {request.last_name}".strip()
        else:
            full_name = request.email.split('@')[0]

        # Get company name from available fields
        company_name = (
            getattr(request, 'company_name', None) or
            getattr(request, 'organization_name', None)
        )

        # Get phone from available fields
        phone = getattr(request, 'phone_number', None) or getattr(request, 'phone', None)

        # Create user
        user = await self.user_repo.create_user(
            email=request.email,
            hashed_password=hashed_pw,
            full_name=full_name,
            user_type=request.user_type.value,
            company_name=company_name,
            phone_number=phone,
        )

        logger.info("User registered", user_id=str(user.id), email=user.email)

        # Generate tokens
        tokens = await self._generate_token_pair(user)
        return user, tokens

    async def login(self, request: LoginRequest) -> Tuple[User, TokenResponse]:
        """
        Authenticate a user and return tokens.

        Args:
            request: Login credentials

        Returns:
            Tuple of (User, TokenResponse)

        Raises:
            HTTPException 401: If credentials are invalid
            HTTPException 403: If account is deactivated
        """
        user = await self.user_repo.get_by_email(request.email)

        if not user or not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email address or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support.",
            )

        logger.info("User logged in", user_id=str(user.id), email=user.email)

        tokens = await self._generate_token_pair(user)
        return user, tokens

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """
        Refresh access and refresh tokens.

        Args:
            refresh_token: Valid refresh token

        Returns:
            New TokenResponse with fresh tokens

        Raises:
            HTTPException 401: If refresh token is invalid or expired
        """
        user_id_str = verify_refresh_token(refresh_token)

        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format.",
            )

        user = await self.user_repo.get_by_id(user_id)

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or account deactivated.",
            )

        # Verify the refresh token matches the stored one (if using token rotation)
        if user.refresh_token and user.refresh_token != refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked.",
            )

        logger.info("Tokens refreshed", user_id=str(user.id))

        return await self._generate_token_pair(user)

    async def logout(self, user: User) -> None:
        """Invalidate a user's refresh token."""
        await self.user_repo.update_refresh_token(user.id, None)
        logger.info("User logged out", user_id=str(user.id))

    async def _generate_token_pair(self, user: User) -> TokenResponse:
        """Generate access and refresh token pair for a user."""
        additional_claims = {
            "email": user.email,
            "user_type": user.user_type.value,
            "subscription_tier": user.subscription_tier.value,
        }

        access_token = create_access_token(
            subject=str(user.id),
            additional_claims=additional_claims,
        )

        refresh_token = create_refresh_token(subject=str(user.id))

        # Store refresh token for rotation validation
        await self.user_repo.update_refresh_token(user.id, refresh_token)

        return TokenResponse(
            access=access_token,
            refresh=refresh_token,
            token_type="bearer",
            expires_in=get_token_expiry_seconds(),
        )

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        """
        Change user password after verifying current password.

        Raises:
            HTTPException 400: If current password is incorrect
        """
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )

        new_hashed_pw = hash_password(new_password)
        await self.user_repo.update_password(user.id, new_hashed_pw)

        # Invalidate all tokens
        await self.user_repo.update_refresh_token(user.id, None)
        logger.info("Password changed", user_id=str(user.id))
