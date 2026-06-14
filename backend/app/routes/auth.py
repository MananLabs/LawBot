"""
Authentication routes: register, login, refresh, logout, profile management.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    UserUpdate,
    ChangePasswordRequest,
    RefreshTokenRequest,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.

    - Validates email uniqueness
    - Hashes password securely with bcrypt
    - Returns JWT tokens immediately upon registration
    """
    auth_service = AuthService(db)
    user, tokens = await auth_service.register(request)

    return {
        "user": UserResponse.model_validate(user).model_dump(),
        "tokens": tokens.model_dump(),
        "message": "Registration successful. Welcome to LawBot!",
    }


@router.post(
    "/login",
    response_model=dict,
    summary="Authenticate and receive JWT tokens",
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with email and password.

    Returns JWT access token and refresh token.
    Access token expires in 30 minutes; refresh token in 7 days.
    """
    auth_service = AuthService(db)
    user, tokens = await auth_service.login(request)

    return {
        "user": UserResponse.model_validate(user).model_dump(),
        "tokens": tokens.model_dump(),
        "message": "Login successful.",
    }


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using refresh token",
)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a valid refresh token for a new access token and refresh token.
    Old refresh token is invalidated (token rotation).
    """
    auth_service = AuthService(db)
    return await auth_service.refresh_tokens(request.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout and invalidate tokens",
)
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout and invalidate the current user's refresh token.
    """
    auth_service = AuthService(db)
    await auth_service.logout(current_user)
    return {"message": "Logged out successfully."}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the profile of the currently authenticated user.
    """
    return UserResponse.model_validate(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_profile(
    request: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's profile information.
    """
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)

    update_data = request.model_dump(exclude_none=True, exclude_unset=True)
    updated_user = await user_repo.update(current_user.id, update_data)

    return UserResponse.model_validate(updated_user)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change user password",
)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change the current user's password.
    Requires the current password for verification.
    All sessions are invalidated after password change.
    """
    auth_service = AuthService(db)
    await auth_service.change_password(
        user=current_user,
        current_password=request.current_password,
        new_password=request.new_password,
    )
    return {"message": "Password changed successfully. Please login again."}
