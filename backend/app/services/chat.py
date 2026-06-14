"""
Chat service using LangGraph workflow for legal Q&A.
Workflow: retrieve context → rerank → generate response → format response
Supports both streaming and non-streaming responses.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, AsyncGenerator, Dict, Any, List, Annotated

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.message import MessageRole, RiskLevel
from app.models.user import User
from app.repositories.conversation import ConversationRepository, MessageRepository
from app.repositories.document import DocumentRepository
from app.schemas.chat import (
    ChatRequest, ChatResponse, StreamChunk, Source, ReferencedClause
)
from app.services.llm import LLMService, LAWBOT_SYSTEM_PROMPT, get_llm_service
from app.services.rag import RAGService

logger = structlog.get_logger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# LangGraph State & Workflow
# ──────────────────────────────────────────────────────────────────────────────
try:
    from typing import TypedDict
    from langgraph.graph import StateGraph, END

    class ChatState(TypedDict):
        """State object passed through the LangGraph workflow."""
        query: str
        user_id: str
        conversation_id: str
        document_id: Optional[str]
        chat_history: List[Dict[str, str]]
        retrieved_context: str
        sources: List[Dict[str, Any]]
        llm_provider: str
        llm_response: Optional[Dict[str, Any]]
        error: Optional[str]

    def build_chat_graph():
        """Build the LangGraph workflow for chat."""
        from langgraph.graph import StateGraph

        workflow = StateGraph(ChatState)

        # Add nodes
        workflow.add_node("retrieve_context", retrieve_context_node)
        workflow.add_node("generate_response", generate_response_node)
        workflow.add_node("format_response", format_response_node)

        # Define flow
        workflow.set_entry_point("retrieve_context")
        workflow.add_edge("retrieve_context", "generate_response")
        workflow.add_edge("generate_response", "format_response")
        workflow.add_edge("format_response", END)

        return workflow.compile()

    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logger.warning("LangGraph not available, using simple chat pipeline")


async def retrieve_context_node(state: "ChatState") -> "ChatState":
    """LangGraph node: retrieve relevant context from Qdrant."""
    rag = RAGService()

    document_id = uuid.UUID(state["document_id"]) if state.get("document_id") else None

    context, sources = await rag.retrieve(
        query=state["query"],
        user_id=uuid.UUID(state["user_id"]),
        document_id=document_id,
    )

    return {
        **state,
        "retrieved_context": context,
        "sources": [s.model_dump() if hasattr(s, 'model_dump') else s for s in sources],
    }


async def generate_response_node(state: "ChatState") -> "ChatState":
    """LangGraph node: generate LLM response with context."""
    llm = get_llm_service(provider=state.get("llm_provider"))

    # Build messages with context
    context = state.get("retrieved_context", "")
    chat_history = state.get("chat_history", [])
    query = state["query"]

    # Construct the user message with context
    if context:
        user_message = f"""Based on the following legal context, answer the question:

RELEVANT CONTEXT:
{context}

USER QUESTION: {query}

Please provide a structured legal analysis. Return your response as a JSON object with these fields:
- answer: your main response
- summary: brief 1-2 sentence summary
- risk_level: low/medium/high/critical/none
- confidence: float between 0.0 and 1.0
- recommendations: list of actionable recommendations
- referenced_clauses: list of referenced legal clauses
"""
    else:
        user_message = f"""{query}

Please provide a structured legal analysis. Return your response as a JSON object with these fields:
- answer: your main response
- summary: brief 1-2 sentence summary
- risk_level: low/medium/high/critical/none
- confidence: float between 0.0 and 1.0
- recommendations: list of actionable recommendations
"""

    messages = chat_history + [{"role": "user", "content": user_message}]

    try:
        response = await llm.chat(
            messages=messages,
            json_mode=True,
            temperature=0.1,
        )
        return {**state, "llm_response": response}
    except Exception as e:
        logger.error("LLM generation failed", error=str(e))
        return {
            **state,
            "llm_response": None,
            "error": str(e),
        }


async def format_response_node(state: "ChatState") -> "ChatState":
    """LangGraph node: parse and validate LLM response."""
    llm_response = state.get("llm_response")

    if not llm_response or state.get("error"):
        # Return a fallback response
        state["llm_response"] = {
            "content": json.dumps({
                "answer": "I apologize, but I encountered an error processing your request. Please try again.",
                "risk_level": "NONE",
                "confidence": 0.0,
                "recommendations": [],
            }),
            "provider": state.get("llm_provider", settings.default_llm_provider),
            "model": "unknown",
            "usage": {},
        }

    return state


class ChatService:
    """
    Chat service orchestrating the LangGraph-based legal Q&A workflow.
    Handles conversation management, message persistence, and streaming.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.conv_repo = ConversationRepository(db)
        self.msg_repo = MessageRepository(db)
        self.doc_repo = DocumentRepository(db)

        # Build LangGraph workflow
        self._graph = None
        if LANGGRAPH_AVAILABLE:
            try:
                self._graph = build_chat_graph()
            except Exception as e:
                logger.warning("Failed to build LangGraph", error=str(e))

    async def chat(
        self,
        request: ChatRequest,
        user: User,
    ) -> ChatResponse:
        """
        Process a chat message and return a structured legal response.

        Args:
            request: Chat request with message and options
            user: Authenticated user

        Returns:
            Structured ChatResponse with legal analysis
        """
        # Get or create conversation
        conversation = await self._get_or_create_conversation(request, user)

        # Save user message
        user_msg = await self.msg_repo.create_message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=request.message,
        )

        # Increment message count
        await self.conv_repo.increment_message_count(conversation.id)

        # Get chat history for context window
        recent_messages = await self.msg_repo.get_recent_messages(
            conversation_id=conversation.id,
            limit=request.context_window,
        )

        chat_history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in recent_messages[:-1]  # Exclude the just-added user message
        ]

        # Validate document access if provided
        document_id = None
        if request.document_id:
            doc = await self.doc_repo.get_by_id_and_user(
                request.document_id, user.id
            )
            if doc:
                document_id = str(request.document_id)

        # Run the pipeline
        provider = request.llm_provider or settings.default_llm_provider

        if self._graph:
            result = await self._run_with_langgraph(
                query=request.message,
                user_id=str(user.id),
                conversation_id=str(conversation.id),
                document_id=document_id,
                chat_history=chat_history,
                llm_provider=provider,
            )
        else:
            result = await self._run_simple_pipeline(
                query=request.message,
                user_id=str(user.id),
                document_id=document_id,
                chat_history=chat_history,
                llm_provider=provider,
            )

        # Parse the structured response
        parsed = self._parse_llm_result(result)

        # Save assistant message
        assistant_msg = await self.msg_repo.create_message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=parsed["answer"],
            metadata={
                "summary": parsed.get("summary"),
                "sources": result.get("sources", []),
                "referenced_clauses": parsed.get("referenced_clauses", []),
                "recommendations": parsed.get("recommendations", []),
                "disclaimer": parsed.get("disclaimer"),
            },
            risk_level=parsed.get("risk_level", "NONE"),
            confidence_score=parsed.get("confidence", 0.0),
            llm_provider=result.get("provider", provider),
            model_used=result.get("model"),
            prompt_tokens=result.get("usage", {}).get("prompt_tokens"),
            completion_tokens=result.get("usage", {}).get("completion_tokens"),
        )

        # Update conversation message count
        await self.conv_repo.increment_message_count(conversation.id)

        # Auto-update conversation title from first message
        if conversation.message_count <= 2:
            title = request.message[:80].strip()
            if len(request.message) > 80:
                title += "..."
            await self.conv_repo.update_title(conversation.id, title)

        # Build sources list
        raw_sources = result.get("sources", [])
        sources = [
            Source(**s) if isinstance(s, dict) else s
            for s in raw_sources
        ]

        # Build referenced clauses
        raw_clauses = parsed.get("referenced_clauses", [])
        referenced_clauses = []
        for clause in raw_clauses:
            if isinstance(clause, dict):
                try:
                    referenced_clauses.append(ReferencedClause(**clause))
                except Exception:
                    pass

        return ChatResponse(
            conversation_id=conversation.id,
            message_id=assistant_msg.id,
            role=MessageRole.ASSISTANT,
            answer=parsed["answer"],
            summary=parsed.get("summary"),
            risk_level=RiskLevel(parsed.get("risk_level", "NONE")),
            confidence=float(parsed.get("confidence", 0.0)),
            sources=sources,
            referenced_clauses=referenced_clauses,
            recommendations=parsed.get("recommendations", []),
            disclaimer=parsed.get("disclaimer", LAWBOT_SYSTEM_PROMPT.split("Disclaimer")[-1][:200] if "Disclaimer" in LAWBOT_SYSTEM_PROMPT else "For informational purposes only."),
            llm_provider=result.get("provider", provider),
            model_used=result.get("model"),
            created_at=assistant_msg.created_at,
        )

    async def stream_chat(
        self,
        request: ChatRequest,
        user: User,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat response as Server-Sent Events.

        Yields:
            JSON-encoded SSE data strings
        """
        # Get or create conversation
        conversation = await self._get_or_create_conversation(request, user)

        # Save user message
        await self.msg_repo.create_message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=request.message,
        )
        await self.conv_repo.increment_message_count(conversation.id)

        # Get chat history
        recent_messages = await self.msg_repo.get_recent_messages(
            conversation_id=conversation.id,
            limit=request.context_window,
        )
        chat_history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in recent_messages[:-1]
        ]

        # RAG retrieval
        rag = RAGService()
        document_id = None
        if request.document_id:
            doc = await self.doc_repo.get_by_id_and_user(request.document_id, user.id)
            if doc:
                document_id = request.document_id

        context, sources = await rag.retrieve(
            query=request.message,
            user_id=user.id,
            document_id=document_id,
        )

        # Emit sources metadata first
        if sources:
            sources_data = StreamChunk(
                type="metadata",
                metadata={
                    "sources": [s.model_dump() for s in sources],
                    "conversation_id": str(conversation.id),
                }
            )
            yield f"data: {sources_data.model_dump_json()}\n\n"

        # Build messages
        provider = request.llm_provider or settings.default_llm_provider
        llm = get_llm_service(provider=provider)

        if context:
            user_content = f"CONTEXT:\n{context}\n\nQUESTION: {request.message}"
        else:
            user_content = request.message

        messages = chat_history + [{"role": "user", "content": user_content}]

        # Stream the response
        full_content = ""
        try:
            async for token in llm.stream_chat(messages=messages):
                full_content += token
                chunk = StreamChunk(type="content", content=token)
                yield f"data: {chunk.model_dump_json()}\n\n"

        except Exception as e:
            error_chunk = StreamChunk(type="error", error=str(e))
            yield f"data: {error_chunk.model_dump_json()}\n\n"
            return

        # Save the assistant response
        try:
            assistant_msg = await self.msg_repo.create_message(
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT,
                content=full_content,
                metadata={
                    "sources": [s.model_dump() for s in sources],
                    "streaming": True,
                },
                llm_provider=provider,
            )
            await self.conv_repo.increment_message_count(conversation.id)

            # Emit done signal
            done_chunk = StreamChunk(
                type="done",
                metadata={
                    "message_id": str(assistant_msg.id),
                    "conversation_id": str(conversation.id),
                }
            )
            yield f"data: {done_chunk.model_dump_json()}\n\n"
        except Exception as e:
            logger.error("Failed to save streamed response", error=str(e))

    async def _run_with_langgraph(
        self,
        query: str,
        user_id: str,
        conversation_id: str,
        document_id: Optional[str],
        chat_history: List[Dict[str, str]],
        llm_provider: str,
    ) -> Dict[str, Any]:
        """Run the LangGraph workflow."""
        initial_state = {
            "query": query,
            "user_id": user_id,
            "conversation_id": conversation_id,
            "document_id": document_id,
            "chat_history": chat_history,
            "retrieved_context": "",
            "sources": [],
            "llm_provider": llm_provider,
            "llm_response": None,
            "error": None,
        }

        try:
            final_state = await self._graph.ainvoke(initial_state)
            llm_response = final_state.get("llm_response", {})

            return {
                "content": llm_response.get("content", "{}"),
                "sources": final_state.get("sources", []),
                "provider": llm_response.get("provider", llm_provider),
                "model": llm_response.get("model"),
                "usage": llm_response.get("usage", {}),
            }
        except Exception as e:
            logger.error("LangGraph execution failed", error=str(e))
            return await self._run_simple_pipeline(
                query=query,
                user_id=user_id,
                document_id=document_id,
                chat_history=chat_history,
                llm_provider=llm_provider,
            )

    async def _run_simple_pipeline(
        self,
        query: str,
        user_id: str,
        document_id: Optional[str],
        chat_history: List[Dict[str, str]],
        llm_provider: str,
    ) -> Dict[str, Any]:
        """Simple fallback pipeline when LangGraph is not available."""
        rag = RAGService()
        doc_uuid = uuid.UUID(document_id) if document_id else None
        user_uuid = uuid.UUID(user_id)

        context, sources = await rag.retrieve(
            query=query,
            user_id=user_uuid,
            document_id=doc_uuid,
        )

        llm = get_llm_service(provider=llm_provider)

        if context:
            user_content = f"""Based on the following legal context, answer the question.

RELEVANT CONTEXT:
{context}

USER QUESTION: {query}

Return your response as a JSON object with: answer, summary, risk_level, confidence, recommendations, referenced_clauses."""
        else:
            user_content = f"""{query}

Return your response as a JSON object with: answer, summary, risk_level, confidence, recommendations."""

        messages = chat_history + [{"role": "user", "content": user_content}]

        response = await llm.chat(messages=messages, json_mode=True, temperature=0.1)
        response["sources"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in sources]
        return response

    def _parse_llm_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse the LLM result into a structured response."""
        content = result.get("content", "{}")

        if isinstance(content, dict):
            parsed = content
        else:
            llm = LLMService()
            parsed = llm.parse_json_response(content)

        # Ensure required fields
        if "answer" not in parsed or not parsed["answer"]:
            parsed["answer"] = content if isinstance(content, str) else str(content)

        # Validate risk level
        valid_risk_levels = {"LOW", "MEDIUM", "HIGH", "CRITICAL", "NONE"}
        if parsed.get("risk_level", "").upper() not in valid_risk_levels:
            parsed["risk_level"] = "NONE"
        else:
            parsed["risk_level"] = parsed["risk_level"].upper()

        # Validate confidence
        try:
            confidence = float(parsed.get("confidence", 0.0))
            parsed["confidence"] = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            parsed["confidence"] = 0.0

        return parsed

    async def _get_or_create_conversation(
        self, request: ChatRequest, user: User
    ):
        """Get existing conversation or create a new one."""
        if request.conversation_id:
            conv = await self.conv_repo.get_by_id_and_user(
                request.conversation_id, user.id
            )
            if conv:
                return conv

        # Create new conversation
        return await self.conv_repo.create_conversation(
            user_id=user.id,
            title="New Conversation",
            document_id=request.document_id,
        )
