"""
Chat Sessions API — frontend-compatible routes.

Maps /chat/sessions/* URL patterns (expected by the React frontend) to the
underlying Conversation repository and ChatService. Also provides the
/chat/messages/* endpoints for message sending and streaming.

This router coexists with the existing /chat/conversations/* router.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.repositories.conversation import ConversationRepository, MessageRepository

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat Sessions"])


# ─── Request / Response Schemas ──────────────────────────────────────────────

class SessionCreatePayload(BaseModel):
    title: Optional[str] = "New Conversation"
    initial_message: Optional[str] = None


class SessionUpdatePayload(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    pinned: Optional[bool] = None


class ChatMessagePayload(BaseModel):
    session_id: Optional[str] = None
    content: str = Field(..., min_length=1)
    document_ids: Optional[List[str]] = None
    stream: Optional[bool] = False
    jurisdiction: Optional[str] = None


class QuickQueryPayload(BaseModel):
    question: str
    jurisdiction: Optional[str] = None


# ─── Conversion helpers ───────────────────────────────────────────────────────

def _conv_to_session(conv: Any) -> dict:
    """Convert a Conversation ORM instance to the frontend ChatSession shape."""
    last_msg: Optional[str] = None
    last_msg_at: Optional[str] = None

    # If messages were eagerly loaded, use them; otherwise fall back to summary
    messages = getattr(conv, "messages", None) or []
    if messages:
        last = messages[-1]
        last_msg = (last.content[:200] if last.content else None)
        last_msg_at = last.created_at.isoformat()

    return {
        "id": str(conv.id),
        "title": conv.title,
        "status": "active" if conv.is_active else "archived",
        "messages_count": conv.message_count,
        "last_message": last_msg,
        "last_message_at": last_msg_at,
        "tags": [],
        "pinned": False,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
    }


def _msg_to_frontend(msg: Any, session_id: str) -> dict:
    """Convert a Message ORM instance to the frontend Message shape."""
    role_val = msg.role.value if hasattr(msg.role, "value") else str(msg.role)

    metadata = getattr(msg, "msg_metadata", None) or {}
    citations: List[dict] = []
    if isinstance(metadata, dict):
        # Extract sources / citations stored in metadata by ChatService
        raw_sources = metadata.get("sources", [])
        for src in raw_sources:
            if isinstance(src, dict):
                citations.append({
                    "id": str(uuid.uuid4()),
                    "document_id": src.get("document_id"),
                    "document_name": src.get("document_name"),
                    "section": src.get("chunk_id") or "",
                    "text": src.get("excerpt") or "",
                    "relevance_score": src.get("relevance_score") or 0.0,
                    "url": None,
                    "act_name": None,
                    "section_number": None,
                })

    return {
        "id": str(msg.id),
        "session_id": session_id,
        "role": role_val,
        "content": msg.content,
        "status": "complete",
        "metadata": {
            "model": getattr(msg, "model_used", None),
            "prompt_tokens": getattr(msg, "prompt_tokens", None),
            "completion_tokens": getattr(msg, "completion_tokens", None),
            "processing_time_ms": None,
            "documents_referenced": [],
        },
        "citations": citations,
        "created_at": msg.created_at.isoformat(),
        "updated_at": msg.created_at.isoformat(),
    }


def _paginated(results: list, total: int, page: int, page_size: int) -> dict:
    """Build a PaginatedResponse-compatible dict."""
    has_next = (page * page_size) < total
    has_prev = page > 1
    return {
        "count": total,
        "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
        "previous": f"?page={page - 1}&page_size={page_size}" if has_prev else None,
        "results": results,
    }


# ─── Session CRUD ─────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    pinned: Optional[bool] = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated list of chat sessions in frontend PaginatedResponse format."""
    conv_repo = ConversationRepository(db)
    skip = (page - 1) * page_size

    conversations, total = await conv_repo.get_user_conversations(
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
    )

    results = [_conv_to_session(c) for c in conversations]
    return _paginated(results, total, page, page_size)


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.create_conversation(
        user_id=current_user.id,
        title=payload.title or "New Conversation",
    )
    return _conv_to_session(conversation)


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single chat session by ID."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id,
        user_id=current_user.id,
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return _conv_to_session(conversation)


@router.patch("/sessions/{session_id}")
async def update_session(
    session_id: uuid.UUID,
    payload: SessionUpdatePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a chat session (title, status, etc.)."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id,
        user_id=current_user.id,
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    update_data: dict = {}
    if payload.title is not None:
        update_data["title"] = payload.title
    if payload.status is not None:
        update_data["is_active"] = payload.status == "active"

    if update_data:
        conversation = await conv_repo.update(session_id, update_data)

    return _conv_to_session(conversation)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Archive (soft-delete) a chat session."""
    conv_repo = ConversationRepository(db)
    success = await conv_repo.archive(session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return {"message": "Session deleted."}


@router.post("/sessions/{session_id}/archive", status_code=status.HTTP_200_OK)
async def archive_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Archive a session (used when user explicitly archives)."""
    conv_repo = ConversationRepository(db)
    success = await conv_repo.archive(session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Re-fetch with is_active=False to return archived state
    from sqlalchemy import select
    from app.models.conversation import Conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == session_id)
    )
    conversation = result.scalar_one_or_none()
    return _conv_to_session(conversation) if conversation else {"message": "Archived."}


# ─── Messages ─────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated messages for a session in PaginatedResponse format."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id, user_id=current_user.id
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    msg_repo = MessageRepository(db)
    skip = (page - 1) * page_size
    messages, total = await msg_repo.get_conversation_messages(
        conversation_id=session_id, skip=skip, limit=page_size
    )

    session_id_str = str(session_id)
    results = [_msg_to_frontend(m, session_id_str) for m in messages]
    return _paginated(results, total, page, page_size)


@router.delete("/sessions/{session_id}/messages/{message_id}", status_code=status.HTTP_200_OK)
async def delete_message(
    session_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific message from a session."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id, user_id=current_user.id
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    msg_repo = MessageRepository(db)
    success = await msg_repo.delete(message_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    return {"message": "Message deleted."}


# ─── Non-streaming message endpoint ──────────────────────────────────────────

@router.post("/messages")
async def send_message(
    payload: ChatMessagePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a non-streaming AI response."""
    from app.schemas.chat import ChatRequest
    from app.services.chat import ChatService

    session_id: Optional[uuid.UUID] = None
    if payload.session_id:
        try:
            session_id = uuid.UUID(payload.session_id)
        except ValueError:
            pass

    request = ChatRequest(
        message=payload.content,
        conversation_id=session_id,
        document_id=None,
        stream=False,
    )

    chat_service = ChatService(db)
    response = await chat_service.chat(request=request, user=current_user)

    now = datetime.now(timezone.utc).isoformat()
    final_session_id = str(response.conversation_id)

    assistant_message = {
        "id": str(response.message_id),
        "session_id": final_session_id,
        "role": "assistant",
        "content": response.answer,
        "status": "complete",
        "metadata": {
            "model": response.model_used,
            "processing_time_ms": None,
            "documents_referenced": [],
        },
        "citations": [
            {
                "id": str(uuid.uuid4()),
                "document_id": s.document_id,
                "document_name": s.document_name,
                "section": s.chunk_id or "",
                "text": s.excerpt or "",
                "relevance_score": s.relevance_score or 0.0,
                "url": None,
                "act_name": None,
                "section_number": None,
            }
            for s in (response.sources or [])
        ],
        "created_at": now,
        "updated_at": now,
    }

    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=response.conversation_id,
        user_id=current_user.id,
    )

    session_data = _conv_to_session(conversation) if conversation else {
        "id": final_session_id,
        "title": payload.content[:60],
        "status": "active",
        "messages_count": 1,
        "last_message": response.answer[:200],
        "last_message_at": now,
        "tags": [],
        "pinned": False,
        "created_at": now,
        "updated_at": now,
    }

    return {"message": assistant_message, "session": session_data}


# ─── Streaming endpoint ────────────────────────────────────────────────────────

@router.post("/messages/stream")
async def stream_message(
    payload: ChatMessagePayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream AI response via SSE.
    Accepts {session_id, content, ...} and streams token-by-token.
    If session_id is omitted, a new session is created and a 'session_created'
    event is emitted before the content stream begins.
    """
    from app.schemas.chat import ChatRequest
    from app.services.chat import ChatService

    session_id: Optional[uuid.UUID] = None
    if payload.session_id:
        try:
            session_id = uuid.UUID(payload.session_id)
        except ValueError:
            pass

    async def event_generator():
        try:
            conv_id = session_id

            # Create session on-the-fly if not supplied
            if conv_id is None:
                conv_repo = ConversationRepository(db)
                title = (
                    payload.content[:77] + "..."
                    if len(payload.content) > 80
                    else payload.content
                )
                conversation = await conv_repo.create_conversation(
                    user_id=current_user.id,
                    title=title,
                )
                conv_id = conversation.id
                session_event = _conv_to_session(conversation)
                yield f"data: {json.dumps({'type': 'session_created', 'session': session_event})}\n\n"

            request = ChatRequest(
                message=payload.content,
                conversation_id=conv_id,
                document_id=None,
                stream=True,
            )

            chat_service = ChatService(db)
            async for chunk in chat_service.stream_chat(request=request, user=current_user):
                yield chunk

        except Exception as exc:
            logger.error("streaming error", error=str(exc))
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Regenerate endpoint ─────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/messages/{message_id}/regenerate")
async def regenerate_message(
    session_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Regenerate the assistant's reply to the preceding user message.
    Streams the new response as SSE, identical to /messages/stream.
    The old assistant message is replaced in the store on the frontend.
    """
    from app.schemas.chat import ChatRequest
    from app.services.chat import ChatService

    # Verify session ownership
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id, user_id=current_user.id
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Find the user message that preceded the assistant message being regenerated
    msg_repo = MessageRepository(db)
    messages, _ = await msg_repo.get_conversation_messages(
        conversation_id=session_id, skip=0, limit=200
    )

    # Locate the target assistant message and get its preceding user message
    target_idx = next(
        (i for i, m in enumerate(messages) if str(m.id) == str(message_id)),
        None,
    )

    if target_idx is None or target_idx == 0:
        # Fall back to the last user message
        user_content = next(
            (m.content for m in reversed(messages) if (m.role.value if hasattr(m.role, "value") else m.role) == "user"),
            None,
        )
    else:
        preceding = messages[target_idx - 1]
        role_val = preceding.role.value if hasattr(preceding.role, "value") else str(preceding.role)
        user_content = preceding.content if role_val == "user" else None

    if not user_content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not find preceding user message to regenerate from.",
        )

    # Delete the old assistant message so the new one is stored cleanly
    await msg_repo.delete(message_id)

    async def event_generator():
        try:
            request = ChatRequest(
                message=user_content,
                conversation_id=session_id,
                document_id=None,
                stream=True,
            )
            chat_service = ChatService(db)
            async for chunk in chat_service.stream_chat(request=request, user=current_user):
                yield chunk
        except Exception as exc:
            logger.error("regenerate streaming error", error=str(exc))
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Session utilities ────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/generate-title")
async def generate_session_title(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current session title (or generate one from first messages)."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id, user_id=current_user.id
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return {"title": conversation.title}


@router.get("/sessions/{session_id}/export")
async def export_session(
    session_id: uuid.UUID,
    format: str = Query(default="txt", pattern="^(pdf|txt|docx)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a chat session as a text file."""
    conv_repo = ConversationRepository(db)
    conversation = await conv_repo.get_by_id_and_user(
        conversation_id=session_id, user_id=current_user.id
    )
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    msg_repo = MessageRepository(db)
    messages, _ = await msg_repo.get_conversation_messages(
        conversation_id=session_id, skip=0, limit=1000
    )

    lines = [f"LawBot Chat Export", f"Session: {conversation.title}", "=" * 60, ""]
    for msg in messages:
        role = msg.role.value if hasattr(msg.role, "value") else str(msg.role)
        lines.append(f"[{role.upper()}]  {msg.created_at.strftime('%Y-%m-%d %H:%M')}")
        lines.append(msg.content)
        lines.append("")

    content = "\n".join(lines).encode("utf-8")
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="lawbot-chat.{format}"'},
    )


@router.get("/sessions/{session_id}/suggestions")
async def get_suggestions(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return suggested follow-up questions for the current session."""
    return {
        "questions": [
            "What are the key risks in this document?",
            "Can you summarize the main obligations?",
            "What does Indian law say about this topic?",
            "Are there any compliance issues I should be aware of?",
        ]
    }


@router.post("/sessions/{session_id}/messages/{message_id}/rate")
async def rate_message(
    session_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept message rating (thumbs up/down) — stored for future analytics."""
    return {"message": "Rating recorded."}


@router.post("/sessions/{session_id}/messages/{message_id}/copy")
async def track_copy(
    session_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Track when a user copies a message (analytics)."""
    return {"message": "Copy tracked."}


# ─── Quick query & templates ──────────────────────────────────────────────────

@router.post("/quick-query")
async def quick_legal_query(
    payload: QuickQueryPayload,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Answer a one-off legal question without creating a persistent session."""
    from app.schemas.chat import ChatRequest
    from app.services.chat import ChatService

    request = ChatRequest(
        message=payload.question,
        conversation_id=None,
        stream=False,
    )

    chat_service = ChatService(db)
    response = await chat_service.chat(request=request, user=current_user)

    return {
        "answer": response.answer,
        "citations": [
            {
                "id": str(uuid.uuid4()),
                "document_id": s.document_id,
                "document_name": s.document_name,
                "section": s.chunk_id or "",
                "text": s.excerpt or "",
                "relevance_score": s.relevance_score or 0.0,
                "url": None,
                "act_name": None,
                "section_number": None,
            }
            for s in (response.sources or [])
        ],
    }


@router.get("/templates")
async def get_question_templates(category: Optional[str] = Query(default=None)):
    """Return pre-built legal question templates for the chat UI."""
    templates = [
        {
            "id": "corp-1",
            "category": "corporate",
            "question": "What are the requirements for incorporating a private limited company in India?",
            "description": "Company incorporation process under Companies Act 2013",
        },
        {
            "id": "corp-2",
            "category": "corporate",
            "question": "Explain ESOP regulations under Companies Act 2013 for startups",
            "description": "Employee stock options framework",
        },
        {
            "id": "sebi-1",
            "category": "securities",
            "question": "What are SEBI disclosure requirements for a Series A fundraise?",
            "description": "Fundraising and securities law compliance",
        },
        {
            "id": "gst-1",
            "category": "tax",
            "question": "What are the GST obligations for a SaaS company in India?",
            "description": "GST compliance for technology companies",
        },
        {
            "id": "fema-1",
            "category": "fema",
            "question": "Explain FEMA regulations for receiving foreign investment",
            "description": "Cross-border investment rules and RBI compliance",
        },
        {
            "id": "labour-1",
            "category": "labour",
            "question": "What employment contracts are legally required for startups in India?",
            "description": "Employment law basics and mandatory documentation",
        },
        {
            "id": "ip-1",
            "category": "ip",
            "question": "How do I protect my startup's intellectual property in India?",
            "description": "Patents, trademarks, and copyright for businesses",
        },
        {
            "id": "contract-1",
            "category": "contracts",
            "question": "What are the essential clauses in a vendor services agreement under Indian law?",
            "description": "Key contract terms and best practices",
        },
    ]

    if category:
        templates = [t for t in templates if t["category"] == category]

    return templates


# ─── Trailing-slash aliases (CORS-safe: avoids 307 redirect on POST) ─────────
_slash_routes = [
    # (path, methods, handler, status_code)
    ("/sessions/",                                             ["GET"],    list_sessions,          200),
    ("/sessions/",                                             ["POST"],   create_session,         201),
    ("/sessions/{session_id}/",                                ["GET"],    get_session,            200),
    ("/sessions/{session_id}/",                                ["PATCH"],  update_session,         200),
    ("/sessions/{session_id}/",                                ["DELETE"], delete_session,         200),
    ("/sessions/{session_id}/archive/",                        ["POST"],   archive_session,        200),
    ("/sessions/{session_id}/messages/",                       ["GET"],    get_session_messages,   200),
    ("/sessions/{session_id}/messages/{message_id}/",          ["DELETE"], delete_message,         200),
    ("/messages/",                                             ["POST"],   send_message,           200),
    ("/messages/stream/",                                      ["POST"],   stream_message,         200),
    ("/sessions/{session_id}/generate-title/",                 ["POST"],   generate_session_title, 200),
    ("/sessions/{session_id}/export/",                         ["GET"],    export_session,         200),
    ("/sessions/{session_id}/suggestions/",                    ["GET"],    get_suggestions,        200),
    ("/sessions/{session_id}/messages/{message_id}/regenerate/", ["POST"],   regenerate_message,     200),
    ("/sessions/{session_id}/messages/{message_id}/rate/",     ["POST"],   rate_message,           200),
    ("/sessions/{session_id}/messages/{message_id}/copy/",     ["POST"],   track_copy,             200),
    ("/quick-query/",                                          ["POST"],   quick_legal_query,      200),
    ("/templates/",                                            ["GET"],    get_question_templates, 200),
]

for _path, _methods, _handler, _code in _slash_routes:
    router.add_api_route(
        _path,
        _handler,
        methods=_methods,
        status_code=_code,
        include_in_schema=False,
    )
