"""
Pydantic schemas for chat conversations and messages.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field

from app.models.message import MessageRole, RiskLevel


class Source(BaseModel):
    """A source document referenced in an AI response."""
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    chunk_id: Optional[str] = None
    page_number: Optional[int] = None
    relevance_score: Optional[float] = None
    excerpt: Optional[str] = None


class ReferencedClause(BaseModel):
    """A legal clause referenced in an AI response."""
    clause_type: str
    clause_text: str
    section: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    analysis: Optional[str] = None


class AIResponse(BaseModel):
    """Structured AI response for legal queries."""
    answer: str
    summary: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.NONE
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    sources: List[Source] = Field(default_factory=list)
    referenced_clauses: List[ReferencedClause] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "This response is for informational purposes only and should not be "
        "considered legal advice. Please consult a qualified legal professional "
        "for specific legal matters."
    )


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    role: MessageRole = MessageRole.USER


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: MessageRole
    content: str
    risk_level: Optional[RiskLevel] = None
    confidence_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = Field(None, alias="msg_metadata")
    llm_provider: Optional[str] = None
    model_used: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True, "protected_namespaces": ()}


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    document_id: Optional[uuid.UUID] = None


class ConversationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    document_id: Optional[uuid.UUID] = None
    message_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = None

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int
    page: int
    page_size: int


class ChatRequest(BaseModel):
    """Request to send a chat message and get an AI response."""
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[uuid.UUID] = None
    document_id: Optional[uuid.UUID] = None
    llm_provider: Optional[str] = None  # openai/anthropic/google
    stream: bool = False
    context_window: int = Field(default=10, ge=1, le=20)


class ChatResponse(BaseModel):
    """Full AI chat response."""
    model_config = {"protected_namespaces": ()}

    conversation_id: uuid.UUID
    message_id: uuid.UUID
    role: MessageRole = MessageRole.ASSISTANT
    answer: str
    summary: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.NONE
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    sources: List[Source] = Field(default_factory=list)
    referenced_clauses: List[ReferencedClause] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "This response is for informational purposes only and should not be "
        "considered legal advice."
    )
    llm_provider: Optional[str] = None
    model_used: Optional[str] = None
    created_at: datetime


class StreamChunk(BaseModel):
    """A chunk in a streaming response."""
    type: str  # "content", "metadata", "done", "error"
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
