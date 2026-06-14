"""
JWT token creation/verification and bcrypt password hashing.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Token types
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    additional_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        subject: The token subject (usually user ID)
        additional_claims: Extra claims to include in the token
        expires_delta: Custom expiration time

    Returns:
        Encoded JWT token string
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    expire = datetime.now(timezone.utc) + expires_delta

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": ACCESS_TOKEN_TYPE,
        "jti": str(uuid.uuid4()),
    }

    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT refresh token with longer expiry.

    Args:
        subject: The token subject (usually user ID)
        expires_delta: Custom expiration time

    Returns:
        Encoded JWT refresh token string
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.refresh_token_expire_days)

    expire = datetime.now(timezone.utc) + expires_delta

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": REFRESH_TOKEN_TYPE,
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT token.

    Args:
        token: The JWT token string

    Returns:
        Token payload dictionary

    Raises:
        JWTError: If token is invalid or expired
    """
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def verify_access_token(token: str) -> Optional[str]:
    """
    Verify an access token and return the subject.

    Args:
        token: JWT access token

    Returns:
        Token subject (user ID) or None if invalid
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != ACCESS_TOKEN_TYPE:
            return None
        subject: str = payload.get("sub")
        return subject
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[str]:
    """
    Verify a refresh token and return the subject.

    Args:
        token: JWT refresh token

    Returns:
        Token subject (user ID) or None if invalid
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != REFRESH_TOKEN_TYPE:
            return None
        subject: str = payload.get("sub")
        return subject
    except JWTError:
        return None


def get_token_expiry_seconds() -> int:
    """Return access token expiry in seconds."""
    return settings.access_token_expire_minutes * 60
