"""
Async SQLAlchemy database engine and session factory.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import settings


def create_engine(database_url: str = None, testing: bool = False) -> AsyncEngine:
    url = database_url or settings.database_url
    kwargs = {
        "echo": settings.app_debug,
        "future": True,
    }
    if testing:
        kwargs["poolclass"] = NullPool
    else:
        kwargs["pool_size"] = settings.database_pool_size
        kwargs["max_overflow"] = settings.database_max_overflow
        kwargs["pool_pre_ping"] = True
        kwargs["pool_recycle"] = 3600
    return create_async_engine(url, **kwargs)


engine: AsyncEngine = create_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables."""
    from app.models.base import Base  # noqa: F401 - ensures all models are loaded
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
