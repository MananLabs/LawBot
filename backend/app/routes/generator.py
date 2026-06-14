"""
Legal document generation routes.
"""
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.generator import (
    DocumentGenerationRequest,
    DocumentGenerationResponse,
    DocumentGenerationListResponse,
    DocumentTemplate,
)
from app.services.document_generator import DocumentGeneratorService

router = APIRouter(prefix="/generator", tags=["Document Generator"])


@router.get(
    "/templates",
    response_model=List[DocumentTemplate],
    summary="Get available document templates",
)
async def get_templates(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all available legal document templates.

    Templates include:
    - NDA (Non-Disclosure Agreement)
    - Employment Agreement
    - Founders' Agreement
    - Service Agreement
    - Shareholder Agreement
    - Term Sheet
    - Vendor Agreement
    - MoU
    - Privacy Policy
    - Terms of Service
    - IP Assignment Agreement
    - Consulting Agreement
    """
    gen_service = DocumentGeneratorService(db=None)
    return gen_service.get_available_templates()


@router.post(
    "/generate",
    response_model=DocumentGenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a legal document",
)
async def generate_document(
    request: DocumentGenerationRequest,
    llm_provider: Optional[str] = Query(
        default=None,
        description="LLM provider: openai/anthropic/google"
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a complete, India-compliant legal document using AI.

    The generated document:
    - Is compliant with Indian law (Companies Act 2013, Contract Act 1872, etc.)
    - Uses professional legal language
    - Includes all standard clauses for the document type
    - Can be customized with special conditions and party details
    - Includes proper signature blocks and execution requirements
    """
    gen_service = DocumentGeneratorService(db)
    return await gen_service.generate_document(
        request=request,
        user=current_user,
        llm_provider=llm_provider,
    )


@router.get(
    "/generated",
    response_model=DocumentGenerationListResponse,
    summary="List generated documents",
)
async def list_generated_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of the user's generated legal documents.
    """
    from app.models.generated_document import GeneratedDocument
    from sqlalchemy import func

    skip = (page - 1) * page_size

    # Count
    count_result = await db.execute(
        select(func.count()).where(GeneratedDocument.user_id == current_user.id)
    )
    total = count_result.scalar_one()

    # Fetch
    result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.user_id == current_user.id)
        .offset(skip)
        .limit(page_size)
        .order_by(GeneratedDocument.created_at.desc())
    )
    documents = list(result.scalars().all())

    return DocumentGenerationListResponse(
        documents=[DocumentGenerationResponse.model_validate(doc) for doc in documents],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/generated/{document_id}",
    response_model=DocumentGenerationResponse,
    summary="Get a generated document",
)
async def get_generated_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific generated legal document.
    """
    from app.models.generated_document import GeneratedDocument

    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generated document not found.",
        )

    return DocumentGenerationResponse.model_validate(doc)


@router.delete(
    "/generated/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a generated document",
)
async def delete_generated_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a generated document.
    """
    from app.models.generated_document import GeneratedDocument

    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == document_id,
            GeneratedDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generated document not found.",
        )

    await db.delete(doc)
    return {"message": "Document deleted successfully."}
