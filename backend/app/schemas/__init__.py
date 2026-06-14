"""
Pydantic schemas package for request/response validation.
"""
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    UserUpdate,
    ChangePasswordRequest,
    RefreshTokenRequest,
)
from app.schemas.chat import (
    MessageCreate,
    MessageResponse,
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    ChatRequest,
    ChatResponse,
    StreamChunk,
    AIResponse,
    Source,
    ReferencedClause,
)
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    DocumentProcessingStatus,
)
from app.schemas.contract import (
    ContractAnalysisRequest,
    ContractAnalysisResponse,
    ClauseAnalysis,
    PartyInfo,
)
from app.schemas.generator import (
    DocumentGenerationRequest,
    DocumentGenerationResponse,
    DocumentGenerationListResponse,
    DocumentTemplate,
    PartyDetails,
)
from app.schemas.compliance import (
    ComplianceEventCreate,
    ComplianceEventUpdate,
    ComplianceEventResponse,
    ComplianceDashboardResponse,
    ComplianceEventListResponse,
    ComplianceRiskMetrics,
)

__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    "UserUpdate",
    "ChangePasswordRequest",
    "RefreshTokenRequest",
    "MessageCreate",
    "MessageResponse",
    "ConversationCreate",
    "ConversationResponse",
    "ConversationListResponse",
    "ChatRequest",
    "ChatResponse",
    "StreamChunk",
    "AIResponse",
    "Source",
    "ReferencedClause",
    "DocumentUploadResponse",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentProcessingStatus",
    "ContractAnalysisRequest",
    "ContractAnalysisResponse",
    "ClauseAnalysis",
    "PartyInfo",
    "DocumentGenerationRequest",
    "DocumentGenerationResponse",
    "DocumentGenerationListResponse",
    "DocumentTemplate",
    "PartyDetails",
    "ComplianceEventCreate",
    "ComplianceEventUpdate",
    "ComplianceEventResponse",
    "ComplianceDashboardResponse",
    "ComplianceEventListResponse",
    "ComplianceRiskMetrics",
]
