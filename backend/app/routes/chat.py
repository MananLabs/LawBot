"""
Chat routes: conversations and messages with streaming support.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    MessageResponse,
)
from app.services.chat import ChatService
from app.repositories.conversation import ConversationRepository, MessageRepository

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new chat conversation.
    Optionally associate with a specific uploaded document for document-focused chat.
    """
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.create_conversation(
        user_id=current_user.id,
        title=request.title or "New Conversation",
        document_id=request.document_id,
    )
    return ConversationResponse.model_validate(conversation)


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List all conversations",
)
async def list_conversations(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of the current user's conversations.
    """
    conv_repo = ConversationRepository(db)
    skip = (page - 1) * page_size

    conversations, total = await conv_repo.get_user_conversations(
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
    )

    return ConversationListResponse(
        conversations=[ConversationResponse.model_validate(c) for c in conversations],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get a conversation with messages",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific conversation and all its messages.
    """
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_with_messages(
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return ConversationResponse.model_validate(conversation)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK,
    summary="Archive a conversation",
)
async def archive_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Archive (soft-delete) a conversation.
    """
    conv_repo = ConversationRepository(db)
    success = await conv_repo.archive(conversation_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return {"message": "Conversation archived successfully."}


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
    summary="Send a message and get AI response",
)
async def send_message(
    conversation_id: uuid.UUID,
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to a conversation and receive an AI legal response.

    The AI response includes:
    - Structured legal analysis
    - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
    - Confidence score
    - Source references
    - Referenced legal clauses
    - Actionable recommendations
    - Legal disclaimer
    """
    # Set conversation ID from URL
    request_with_conv = ChatRequest(
        message=request.message,
        conversation_id=conversation_id,
        document_id=request.document_id,
        llm_provider=request.llm_provider,
        stream=False,
        context_window=request.context_window,
    )

    chat_service = ChatService(db)
    return await chat_service.chat(request=request_with_conv, user=current_user)


@router.post(
    "/messages",
    response_model=ChatResponse,
    summary="Send a message (auto-creates conversation)",
)
async def send_message_auto_conversation(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and get an AI legal response.
    Creates a new conversation if conversation_id is not provided.
    """
    chat_service = ChatService(db)
    return await chat_service.chat(request=request, user=current_user)


@router.get(
    "/conversations/{conversation_id}/messages",
    summary="Get messages in a conversation",
)
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated messages for a conversation.
    """
    # Verify conversation belongs to user
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    msg_repo = MessageRepository(db)
    skip = (page - 1) * page_size
    messages, total = await msg_repo.get_conversation_messages(
        conversation_id=conversation_id,
        skip=skip,
        limit=page_size,
    )

    return {
        "conversation_id": str(conversation_id),
        "messages": [MessageResponse.model_validate(m) for m in messages],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/stream",
    summary="Stream AI response via Server-Sent Events",
)
async def stream_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream a chat response via Server-Sent Events (SSE).

    The stream emits:
    - `{"type": "metadata", "metadata": {"sources": [...]}}` - Initial metadata
    - `{"type": "content", "content": "..."}` - Token-by-token content chunks
    - `{"type": "done", "metadata": {"message_id": "..."}}` - Completion signal
    - `{"type": "error", "error": "..."}` - Error signal
    """
    chat_service = ChatService(db)

    async def event_generator():
        async for chunk in chat_service.stream_chat(request=request, user=current_user):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
