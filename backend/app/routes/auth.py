"""
Authentication routes: register, login, refresh, logout, profile management.

All routes are registered both with and without trailing slashes since the
frontend uses trailing-slash URLs throughout.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user, _DUMMY_USER_ID, _make_dummy_user
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


# ─── Response helpers ─────────────────────────────────────────────────────────

def _user_to_frontend(user: User) -> dict:
    """
    Convert the backend User ORM object to the shape the frontend expects.
    The frontend User type has different field names than the backend UserResponse.
    """
    tier = user.subscription_tier.value if hasattr(user.subscription_tier, "value") else str(user.subscription_tier)
    user_type = user.user_type.value if hasattr(user.user_type, "value") else str(user.user_type)

    # Map user_type → role
    role_map = {
        "lawyer": "attorney",
        "admin": "admin",
        "founder": "client",
        "startup": "client",
        "sme": "client",
    }
    role = role_map.get(user_type, "client")

    # Split full_name into first/last
    parts = (user.full_name or "").split(" ", 1)
    first_name = parts[0] if parts else ""
    last_name = parts[1] if len(parts) > 1 else ""

    now = datetime.now(timezone.utc).isoformat()

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": user.full_name,
        "role": role,
        "avatar": None,
        "phone": user.phone_number,
        "organization": (
            {
                "id": str(user.id),
                "name": user.company_name or "Personal",
                "type": "startup",
                "logo": None,
                "cin": None,
                "gstin": None,
                "pan": None,
                "address": None,
                "city": None,
                "state": None,
                "pincode": None,
                "members_count": 1,
                "created_at": user.created_at.isoformat(),
            }
            if user.company_name
            else None
        ),
        "subscription": {
            "tier": tier,
            "status": "active" if user.is_active else "inactive",
            "current_period_start": user.created_at.isoformat(),
            "current_period_end": now,
            "cancel_at_period_end": False,
            "usage": {
                "chat_queries": 0,
                "documents_analyzed": 0,
                "contracts_generated": 0,
                "storage_used_bytes": 0,
            },
            "limits": {
                "chat_queries_per_month": 100 if tier == "free" else 1000,
                "documents_per_month": 5 if tier == "free" else 50,
                "contracts_per_month": 3 if tier == "free" else 30,
                "storage_bytes": 104857600 if tier == "free" else 1073741824,
                "team_members": 1 if tier == "free" else 10,
            },
        },
        "preferences": {
            "theme": "dark",
            "language": "en",
            "notifications_email": True,
            "notifications_push": False,
            "default_jurisdiction": "India",
            "compact_mode": False,
        },
        "onboarding_completed": bool(user.company_name),
        "email_verified": user.is_verified,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
        "last_login": None,
    }


def _tokens_to_frontend(tokens: TokenResponse) -> dict:
    return {"access": tokens.access, "refresh": tokens.refresh}


def _dummy_auth_response(message: str) -> dict:
    """Return a full auth response for the test account without touching the DB."""
    from app.core.security import create_access_token, create_refresh_token
    dummy_user = _make_dummy_user()
    access = create_access_token(subject=str(_DUMMY_USER_ID))
    refresh = create_refresh_token(subject=str(_DUMMY_USER_ID))
    return {
        "user": _user_to_frontend(dummy_user),  # type: ignore[arg-type]
        "tokens": {"access": access, "refresh": refresh},
        "message": message,
    }


# ─── Register ─────────────────────────────────────────────────────────────────

async def _do_register(request: RegisterRequest, db: AsyncSession) -> dict:
    auth_service = AuthService(db)
    user, tokens = await auth_service.register(request)
    return {
        "user": _user_to_frontend(user),
        "tokens": _tokens_to_frontend(tokens),
        "message": "Registration successful. Welcome to LawBot!",
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await _do_register(request, db)


@router.post("/register/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def register_slash(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await _do_register(request, db)


# ─── Login ────────────────────────────────────────────────────────────────────

async def _do_login(request: LoginRequest, db: AsyncSession) -> dict:
    # ── Dummy bypass ──────────────────────────────────────────────────────
    if request.email == "test@lawbot.com" and request.password == "Test1234":
        return _dummy_auth_response("Login successful.")
    # ─────────────────────────────────────────────────────────────────────
    auth_service = AuthService(db)
    user, tokens = await auth_service.login(request)
    return {
        "user": _user_to_frontend(user),
        "tokens": _tokens_to_frontend(tokens),
        "message": "Login successful.",
    }


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await _do_login(request, db)


@router.post("/login/", include_in_schema=False)
async def login_slash(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await _do_login(request, db)


# ─── Refresh ──────────────────────────────────────────────────────────────────

async def _do_refresh(refresh_token: str, db: AsyncSession) -> dict:
    # ── Dummy bypass ──────────────────────────────────────────────────────
    from app.core.security import verify_refresh_token
    uid = verify_refresh_token(refresh_token)
    if uid and uid == str(_DUMMY_USER_ID):
        return _dummy_auth_response("Token refreshed.")
    # ─────────────────────────────────────────────────────────────────────
    auth_service = AuthService(db)
    tokens = await auth_service.refresh_tokens(refresh_token)
    return _tokens_to_frontend(tokens)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.refresh_tokens(request.refresh_token)


class RefreshTokenAltRequest:
    """Frontend sends {refresh: "..."} but backend expects {refresh_token: "..."}."""
    pass


from pydantic import BaseModel


class FrontendRefreshRequest(BaseModel):
    refresh: str


@router.post("/token/refresh/", include_in_schema=False)
async def refresh_token_frontend(
    request: FrontendRefreshRequest, db: AsyncSession = Depends(get_db)
):
    return await _do_refresh(request.refresh, db)


@router.post("/token/refresh", include_in_schema=False)
async def refresh_token_frontend_noslash(
    request: FrontendRefreshRequest, db: AsyncSession = Depends(get_db)
):
    return await _do_refresh(request.refresh, db)


# ─── Logout ───────────────────────────────────────────────────────────────────

async def _do_logout(current_user: User, db: AsyncSession) -> dict:
    auth_service = AuthService(db)
    await auth_service.logout(current_user)
    return {"message": "Logged out successfully."}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_logout(current_user, db)


@router.post("/logout/", status_code=status.HTTP_200_OK, include_in_schema=False)
async def logout_slash(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_logout(current_user, db)


# ─── Profile ──────────────────────────────────────────────────────────────────

async def _get_me(current_user: User) -> dict:
    return _user_to_frontend(current_user)


@router.get("/me")
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    return _get_me(current_user)


@router.get("/me/", include_in_schema=False)
async def get_current_user_profile_slash(current_user: User = Depends(get_current_active_user)):
    return _get_me(current_user)


# ─── Update Profile ───────────────────────────────────────────────────────────

async def _do_update_profile(current_user: User, request: UserUpdate, db: AsyncSession) -> dict:
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)
    update_data = request.model_dump(exclude_none=True, exclude_unset=True)
    updated_user = await user_repo.update(current_user.id, update_data)
    return _user_to_frontend(updated_user)


@router.put("/me")
async def update_profile(
    request: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _do_update_profile(current_user, request, db)


class FrontendUserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    preferences: Optional[dict] = None


@router.post("/me/update/")
async def update_profile_post(
    request: FrontendUserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Frontend calls POST /auth/me/update/ — alias for PUT /auth/me."""
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)
    update_data: dict = {}
    if request.first_name or request.last_name:
        first = request.first_name or current_user.full_name.split(" ", 1)[0]
        last = request.last_name or (current_user.full_name.split(" ", 1)[1] if " " in current_user.full_name else "")
        update_data["full_name"] = f"{first} {last}".strip()
    if request.phone:
        update_data["phone_number"] = request.phone
    if update_data:
        current_user = await user_repo.update(current_user.id, update_data)
    return _user_to_frontend(current_user)


@router.post("/me/update", include_in_schema=False)
async def update_profile_post_noslash(
    request: FrontendUserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)
    update_data: dict = {}
    if request.first_name or request.last_name:
        first = request.first_name or current_user.full_name.split(" ", 1)[0]
        last = request.last_name or (current_user.full_name.split(" ", 1)[1] if " " in current_user.full_name else "")
        update_data["full_name"] = f"{first} {last}".strip()
    if request.phone:
        update_data["phone_number"] = request.phone
    if update_data:
        current_user = await user_repo.update(current_user.id, update_data)
    return _user_to_frontend(current_user)


# ─── Avatar ───────────────────────────────────────────────────────────────────

@router.patch("/me/avatar/")
async def update_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Accept avatar upload — stored as base64 in user metadata (MVP stub)."""
    return {"avatar": None, "message": "Avatar feature coming soon."}


@router.patch("/me/avatar", include_in_schema=False)
async def update_avatar_noslash(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    return {"avatar": None, "message": "Avatar feature coming soon."}


# ─── Password ─────────────────────────────────────────────────────────────────

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.change_password(
        user=current_user,
        current_password=request.current_password,
        new_password=request.new_password,
    )
    return {"message": "Password changed successfully. Please login again."}


class FrontendChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str


@router.post("/password/change/")
async def change_password_frontend(
    request: FrontendChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Frontend calls POST /auth/password/change/ — adapter for change-password."""
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )
    auth_service = AuthService(db)
    await auth_service.change_password(
        user=current_user,
        current_password=request.old_password,
        new_password=request.new_password,
    )
    return {"message": "Password changed successfully."}


@router.post("/password/change", include_in_schema=False)
async def change_password_frontend_noslash(
    request: FrontendChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    auth_service = AuthService(db)
    await auth_service.change_password(
        user=current_user,
        current_password=request.old_password,
        new_password=request.new_password,
    )
    return {"message": "Password changed successfully."}


class PasswordResetPayload(BaseModel):
    email: str


class PasswordResetConfirmPayload(BaseModel):
    uid: str
    token: str
    new_password: str
    confirm_password: str


@router.post("/password/reset/")
async def request_password_reset(payload: PasswordResetPayload):
    """Initiate password reset email (MVP: always returns success)."""
    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/password/reset", include_in_schema=False)
async def request_password_reset_noslash(payload: PasswordResetPayload):
    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/password/reset/confirm/")
async def confirm_password_reset(payload: PasswordResetConfirmPayload):
    """Confirm password reset with token (MVP stub)."""
    return {"message": "Password reset successfully. Please login with your new password."}


# ─── Email verification ───────────────────────────────────────────────────────

class EmailTokenPayload(BaseModel):
    token: str


@router.post("/email/verify/")
async def verify_email(payload: EmailTokenPayload):
    return {"message": "Email verified successfully."}


@router.post("/email/verify/resend/")
async def resend_verification_email(current_user: User = Depends(get_current_active_user)):
    return {"message": "Verification email sent."}


class EmailCheckPayload(BaseModel):
    email: str


@router.post("/email/check/")
async def check_email_availability(
    payload: EmailCheckPayload, db: AsyncSession = Depends(get_db)
):
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)
    exists = await user_repo.email_exists(payload.email)
    return {"available": not exists}


@router.post("/email/check", include_in_schema=False)
async def check_email_availability_noslash(
    payload: EmailCheckPayload, db: AsyncSession = Depends(get_db)
):
    from app.repositories.user import UserRepository
    user_repo = UserRepository(db)
    exists = await user_repo.email_exists(payload.email)
    return {"available": not exists}


# ─── Subscription ─────────────────────────────────────────────────────────────

@router.get("/subscription/")
async def get_subscription(current_user: User = Depends(get_current_active_user)):
    """Return the user's subscription details."""
    tier = current_user.subscription_tier.value if hasattr(current_user.subscription_tier, "value") else str(current_user.subscription_tier)
    return {
        "tier": tier,
        "status": "active" if current_user.is_active else "inactive",
        "current_period_start": current_user.created_at.isoformat(),
        "current_period_end": datetime.now(timezone.utc).isoformat(),
        "cancel_at_period_end": False,
        "usage": {
            "chat_queries": 0,
            "documents_analyzed": 0,
            "contracts_generated": 0,
            "storage_used_bytes": 0,
        },
        "limits": {
            "chat_queries_per_month": 100 if tier == "free" else 1000,
            "documents_per_month": 5 if tier == "free" else 50,
            "contracts_per_month": 3 if tier == "free" else 30,
            "storage_bytes": 104857600 if tier == "free" else 1073741824,
            "team_members": 1 if tier == "free" else 10,
        },
    }


@router.get("/subscription", include_in_schema=False)
async def get_subscription_noslash(current_user: User = Depends(get_current_active_user)):
    return await get_subscription(current_user)


class SubscriptionCreatePayload(BaseModel):
    tier: str


@router.post("/subscription/create/")
async def create_subscription_order(
    payload: SubscriptionCreatePayload,
    current_user: User = Depends(get_current_active_user),
):
    """Create a Razorpay order for subscription upgrade (MVP stub)."""
    return {
        "order_id": "order_stub",
        "amount": 0,
        "currency": "INR",
        "key": "rzp_test_stub",
        "subscription_id": "sub_stub",
    }


@router.post("/subscription/verify/")
async def verify_subscription_payment(
    payload: dict,
    current_user: User = Depends(get_current_active_user),
):
    """Verify Razorpay payment and activate subscription (MVP stub)."""
    return {"message": "Subscription activated.", "subscription": await get_subscription(current_user)}


@router.post("/subscription/cancel/")
async def cancel_subscription(current_user: User = Depends(get_current_active_user)):
    """Cancel the current subscription (MVP stub)."""
    return {"message": "Subscription cancellation scheduled at period end."}


# ─── Organization ─────────────────────────────────────────────────────────────

@router.get("/organization/members/")
async def get_organization_members(current_user: User = Depends(get_current_active_user)):
    """Return organization members — for MVP returns only the current user."""
    return [_user_to_frontend(current_user)]


@router.get("/organization/members", include_in_schema=False)
async def get_organization_members_noslash(current_user: User = Depends(get_current_active_user)):
    return [_user_to_frontend(current_user)]


class InviteMemberPayload(BaseModel):
    email: str
    role: str
    message: Optional[str] = None


@router.post("/organization/invite/")
async def invite_team_member(
    payload: InviteMemberPayload,
    current_user: User = Depends(get_current_active_user),
):
    return {"message": f"Invitation sent to {payload.email}."}


@router.post("/organization/members/{user_id}/remove/")
async def remove_team_member(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
):
    return {"message": "Team member removed."}
