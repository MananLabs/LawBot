"""
Pydantic schemas for authentication and user management.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, Field

from app.models.user import UserType, SubscriptionTier


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    user_type: UserType = UserType.FOUNDER
    organization_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)

    @property
    def full_name(self) -> str:
        return f"{self.first_name.strip()} {self.last_name.strip()}"

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    model_config = {"str_strip_whitespace": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = {"str_strip_whitespace": True}


class TokenResponse(BaseModel):
    access: str
    refresh: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class AuthResponse(BaseModel):
    user: "UserResponse"
    tokens: TokenResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    user_type: UserType
    is_active: bool
    is_verified: bool
    subscription_tier: SubscriptionTier
    company_name: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    user_type: Optional[UserType] = None

    model_config = {"str_strip_whitespace": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
