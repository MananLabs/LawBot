"""
LawBot FastAPI Application Entry Point
AI-Powered Indian Corporate Law Copilot
"""
import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, close_db

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting LawBot API", env=settings.app_env, version="1.0.0")

    # Create upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Initialize database tables
    if settings.app_env != "production":
        try:
            await init_db()
            logger.info("Database initialized")
        except Exception as e:
            logger.error("Database initialization failed", error=str(e))

    yield

    # Cleanup
    await close_db()
    logger.info("LawBot API shutdown complete")


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="LawBot API",
        description="AI-Powered Indian Corporate Law Copilot — Backend API",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Length", "X-Request-ID"],
    )

    # ── GZIP ──────────────────────────────────────────────────────────────────
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ── ROUTERS ───────────────────────────────────────────────────────────────
    _register_routers(app)

    # ── EXCEPTION HANDLERS ───────────────────────────────────────────────────
    _register_exception_handlers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    """Register all API routers."""
    from app.routes import auth, chat, documents, contracts, generator, compliance

    # Routers define their own prefix (e.g. prefix="/auth"), we add the base /api/v1
    API_PREFIX = "/api/v1"

    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(chat.router, prefix=API_PREFIX)
    app.include_router(documents.router, prefix=API_PREFIX)
    app.include_router(contracts.router, prefix=API_PREFIX)
    app.include_router(generator.router, prefix=API_PREFIX)
    app.include_router(compliance.router, prefix=API_PREFIX)


def _register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers."""
    from fastapi import Request, HTTPException
    from fastapi.exceptions import RequestValidationError
    from pydantic import ValidationError

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": exc.detail,
                "status_code": exc.status_code,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            field = " → ".join(str(loc) for loc in error["loc"])
            errors.append({"field": field, "message": error["msg"]})

        return JSONResponse(
            status_code=422,
            content={
                "error": True,
                "message": "Validation failed",
                "errors": errors,
                "status_code": 422,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception",
            path=str(request.url),
            method=request.method,
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "An internal server error occurred.",
                "status_code": 500,
            },
        )


# ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app = create_application()


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "LawBot API",
        "version": "1.0.0",
        "environment": settings.app_env,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "service": "LawBot API",
        "version": "1.0.0",
        "description": "AI-Powered Indian Corporate Law Copilot",
        "docs": "/docs",
        "status": "operational",
    }


# ── ENTRY POINT ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
        log_level=settings.log_level.lower(),
        access_log=True,
    )
