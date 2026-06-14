"""
Rate limiting middleware using SlowAPI (Redis-backed).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.config import settings


def _get_client_identifier(request: Request) -> str:
    """
    Get a unique identifier for the client.
    Uses JWT user ID if authenticated, falls back to IP address.
    """
    # Try to get user ID from JWT token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import verify_access_token
            token = auth_header.replace("Bearer ", "")
            user_id = verify_access_token(token)
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass

    # Fall back to IP address
    return get_remote_address(request)


# Create the limiter instance
limiter = Limiter(
    key_func=_get_client_identifier,
    storage_uri=settings.redis_url,
    default_limits=[
        f"{settings.rate_limit_per_minute}/minute",
        f"{settings.rate_limit_per_hour}/hour",
    ],
)


async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> Response:
    """
    Custom handler for rate limit exceeded errors.
    Returns a structured JSON response with retry information.
    """
    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": f"Too many requests. Please retry after {retry_after} seconds.",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )
