"""
Pydantic schemas for legal document generation.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field

from app.models.generated_document import GeneratedDocType, GeneratedDocStatus


class PartyDetails(BaseModel):
    """Details of a party in a legal document."""
    name: str
    role: str
    address: Optional[str] = None
    entity_type: Optional[str] = None  # individual/company/llp/partnership
    registration_number: Optional[str] = None
    represented_by: Optional[str] = None


class DocumentGenerationRequest(BaseModel):
    """Request to generate a legal document."""
    doc_type: GeneratedDocType
    title: Optional[str] = None

    # Core Details
    company_name: Optional[str] = Field(None, max_length=255)
    jurisdiction: str = Field(default="India", max_length=100)
    parties: Optional[List[PartyDetails]] = Field(default_factory=list)
    purpose: Optional[str] = Field(None, max_length=2000)

    # Agreement Terms
    term: Optional[str] = Field(None, max_length=500, description="Duration of the agreement")
    start_date: Optional[str] = None
    end_date: Optional[str] = None

    # Financial Terms
    payment_amount: Optional[str] = None
    payment_schedule: Optional[str] = None
    currency: str = Field(default="INR")

    # Special Conditions
    special_conditions: Optional[List[str]] = Field(default_factory=list)
    exclusions: Optional[List[str]] = Field(default_factory=list)
    custom_clauses: Optional[List[str]] = Field(default_factory=list)

    # Dispute Resolution
    dispute_resolution: Optional[str] = Field(
        default="arbitration",
        description="arbitration/mediation/litigation/negotiation"
    )
    arbitration_city: Optional[str] = Field(default="Mumbai")

    # IP & Confidentiality
    include_nda: bool = False
    include_ip_assignment: bool = False
    ip_owner: Optional[str] = None

    # Additional Context
    additional_context: Optional[str] = Field(None, max_length=5000)
    template_id: Optional[str] = None

    model_config = {"str_strip_whitespace": True}


class DocumentTemplate(BaseModel):
    """A document template available for generation."""
    template_id: str
    doc_type: GeneratedDocType
    name: str
    description: str
    jurisdiction: str = "India"
    required_fields: List[str] = Field(default_factory=list)
    optional_fields: List[str] = Field(default_factory=list)
    estimated_pages: Optional[int] = None
    tags: List[str] = Field(default_factory=list)


class DocumentGenerationResponse(BaseModel):
    """Response for document generation."""
    id: uuid.UUID
    user_id: uuid.UUID
    doc_type: GeneratedDocType
    title: str
    status: GeneratedDocStatus
    content: Optional[str] = None
    file_path: Optional[str] = None
    jurisdiction: str
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentGenerationListResponse(BaseModel):
    documents: List[DocumentGenerationResponse]
    total: int
    page: int
    page_size: int
