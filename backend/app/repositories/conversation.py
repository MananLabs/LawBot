"""
Conversation and Message repositories.
"""
import uuid
from typing import Optional, List, Tuple

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    """Repository for Conversation model CRUD operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Conversation, db)

    async def get_user_conversations(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        include_messages: bool = False,
    ) -> Tuple[List[Conversation], int]:
        """Get paginated conversations for a user."""
        query = select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.is_active == True,  # noqa: E712
        )

        if include_messages:
            query = query.options(selectinload(Conversation.messages))

        # Count
        count_query = select(func.count()).select_from(
            select(Conversation).where(
                Conversation.user_id == user_id,
                Conversation.is_active == True,  # noqa: E712
            ).subquery()
        )
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.offset(skip).limit(limit).order_by(Conversation.updated_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_by_id_with_messages(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[Conversation]:
        """Get a conversation with all its messages."""
        result = await self.db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
            .options(selectinload(Conversation.messages))
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[Conversation]:
        """Get a conversation ensuring it belongs to the user."""
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_conversation(
        self,
        user_id: uuid.UUID,
        title: str = "New Conversation",
        document_id: Optional[uuid.UUID] = None,
    ) -> Conversation:
        """Create a new conversation."""
        return await self.create({
            "user_id": user_id,
            "title": title,
            "document_id": document_id,
            "message_count": 0,
            "is_active": True,
        })

    async def increment_message_count(
        self, conversation_id: uuid.UUID
    ) -> None:
        """Increment the message count for a conversation."""
        conv = await self.get_by_id(conversation_id)
        if conv:
            await self.update(conversation_id, {
                "message_count": conv.message_count + 1
            })

    async def update_title(
        self, conversation_id: uuid.UUID, title: str
    ) -> Optional[Conversation]:
        """Update conversation title."""
        return await self.update(conversation_id, {"title": title})

    async def archive(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        """Archive (soft delete) a conversation."""
        conv = await self.get_by_id_and_user(conversation_id, user_id)
        if not conv:
            return False
        await self.update(conversation_id, {"is_active": False})
        return True


class MessageRepository(BaseRepository[Message]):
    """Repository for Message model CRUD operations."""

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Message, db)

    async def get_conversation_messages(
        self,
        conversation_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Message], int]:
        """Get paginated messages for a conversation."""
        # Count
        count_result = await self.db.execute(
            select(func.count()).where(Message.conversation_id == conversation_id)
        )
        total = count_result.scalar_one()

        # Fetch
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .offset(skip)
            .limit(limit)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all()), total

    async def get_recent_messages(
        self,
        conversation_id: uuid.UUID,
        limit: int = 10,
    ) -> List[Message]:
        """Get the most recent messages in a conversation (for context window)."""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = list(result.scalars().all())
        return list(reversed(messages))  # Return in chronological order

    async def create_message(
        self,
        conversation_id: uuid.UUID,
        role: MessageRole,
        content: str,
        metadata: Optional[dict] = None,
        risk_level: Optional[str] = None,
        confidence_score: Optional[float] = None,
        llm_provider: Optional[str] = None,
        model_used: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
    ) -> Message:
        """Create a new message in a conversation."""
        return await self.create({
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "msg_metadata": metadata or {},
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "llm_provider": llm_provider,
            "model_used": model_used,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        })
