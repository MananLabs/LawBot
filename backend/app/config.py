"""
Application configuration using Pydantic Settings.
All settings are loaded from environment variables or .env file.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator, AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "LawBot"
    app_env: str = "development"
    app_debug: bool = False
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    secret_key: str = "change-this-secret-key-in-production-minimum-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Database
    database_url: str = "postgresql+asyncpg://lawbot:lawbot_password@localhost:5432/lawbot_db"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection_name: str = "lawbot_documents"
    qdrant_api_key: Optional[str] = None

    # LLM Configuration
    default_llm_provider: str = "openai"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    google_api_key: Optional[str] = None
    google_model: str = "gemini-1.5-pro"

    # Embeddings
    bge_model_name: str = "BAAI/bge-m3"
    bge_reranker_model: str = "BAAI/bge-reranker-v2-m3"
    embedding_device: str = "cpu"
    embedding_batch_size: int = 32

    # File Storage
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50
    allowed_file_types: str = "pdf,docx,doc,txt,xlsx,xls"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"
    allowed_methods: str = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
    allowed_headers: str = "*"

    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # RAG Config
    enable_streaming: bool = True
    enable_rag: bool = True
    enable_reranker: bool = True
    max_context_chunks: int = 10
    chunk_size: int = 1000
    chunk_overlap: int = 200

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [ft.strip().lower() for ft in self.allowed_file_types.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
