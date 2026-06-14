"""
Authentication middleware for logging and audit trail.
"""
import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = structlog.get_logger(__name__)

# Paths that don't require authentication logging
PUBLIC_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for request/response logging and audit trail.
    Logs all requests with timing, user info, and status codes.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        start_time = time.monotonic()

        # Extract user info from token (best effort)
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.core.security import verify_access_token
                token = auth_header.replace("Bearer ", "")
                user_id = verify_access_token(token)
            except Exception:
                pass

        # Add request ID to request state for downstream use
        request.state.request_id = request_id
        request.state.user_id = user_id

        # Log incoming request
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
            user_id=user_id,
        )

        try:
            response = await call_next(request)
        except Exception as e:
            duration = time.monotonic() - start_time
            logger.error(
                "Request failed with exception",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration * 1000, 2),
                error=str(e),
                user_id=user_id,
                exc_info=True,
            )
            raise

        duration = time.monotonic() - start_time

        # Log completed request
        log_level = "warning" if response.status_code >= 400 else "info"
        getattr(logger, log_level)(
            "Request completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
            user_id=user_id,
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(round(duration * 1000, 2))

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Content Security Policy for API responses
        if not request.url.path.startswith("/docs"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; "
                "frame-ancestors 'none';"
            )

        return response
