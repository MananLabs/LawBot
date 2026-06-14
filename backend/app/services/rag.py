"""
RAG (Retrieval-Augmented Generation) pipeline service.
Flow: Query → BGE-M3 embed → Qdrant hybrid search → BGE Reranker → Assembled context
"""
from typing import List, Optional, Dict, Any, Tuple
import uuid

import structlog

from app.config import settings
from app.schemas.chat import Source

logger = structlog.get_logger(__name__)


class RAGService:
    """
    Retrieval-Augmented Generation pipeline for LawBot.
    Uses BGE-M3 for query embedding, Qdrant for hybrid search,
    and BGE reranker for result reranking.
    """

    def __init__(self) -> None:
        self._embedder = None
        self._reranker = None
        self._qdrant_client = None

    def _get_embedder(self):
        """Lazy-load BGE-M3 embedder."""
        if self._embedder is None:
            try:
                from FlagEmbedding import BGEM3FlagModel
                self._embedder = BGEM3FlagModel(
                    settings.bge_model_name,
                    use_fp16=True,
                    device=settings.embedding_device,
                )
            except ImportError:
                logger.warning("BGE-M3 not available, using OpenAI embeddings")
                self._embedder = "openai"
        return self._embedder

    def _get_reranker(self):
        """Lazy-load BGE reranker model."""
        if self._reranker is None and settings.enable_reranker:
            try:
                from FlagEmbedding import FlagReranker
                self._reranker = FlagReranker(
                    settings.bge_reranker_model,
                    use_fp16=True,
                    device=settings.embedding_device,
                )
                logger.info("BGE reranker loaded", model=settings.bge_reranker_model)
            except ImportError:
                logger.warning("BGE reranker not available, skipping reranking")
                self._reranker = "disabled"
        return self._reranker

    def _get_qdrant(self):
        """Lazy-load Qdrant client."""
        if self._qdrant_client is None:
            from qdrant_client import QdrantClient
            self._qdrant_client = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
                api_key=settings.qdrant_api_key or None,
            )
        return self._qdrant_client

    async def retrieve(
        self,
        query: str,
        user_id: uuid.UUID,
        document_id: Optional[uuid.UUID] = None,
        top_k: int = None,
    ) -> Tuple[str, List[Source]]:
        """
        Full RAG pipeline: embed query → search Qdrant → rerank → assemble context.

        Args:
            query: The user's legal question
            user_id: The authenticated user's ID (for filtering)
            document_id: Optional specific document to search within
            top_k: Number of chunks to retrieve

        Returns:
            Tuple of (assembled_context_string, list_of_sources)
        """
        if not settings.enable_rag:
            return "", []

        k = top_k or settings.max_context_chunks

        try:
            # Step 1: Embed the query
            query_embedding, query_sparse = await self._embed_query(query)

            # Step 2: Hybrid search in Qdrant
            results = await self._search_qdrant(
                query_dense=query_embedding,
                query_sparse=query_sparse,
                user_id=str(user_id),
                document_id=str(document_id) if document_id else None,
                top_k=k * 3,  # Retrieve more for reranking
            )

            if not results:
                logger.info("No results from Qdrant", query=query[:50])
                return "", []

            # Step 3: Rerank results
            if settings.enable_reranker and results:
                results = await self._rerank(query, results, top_k=k)
            else:
                results = results[:k]

            # Step 4: Assemble context and sources
            context, sources = self._assemble_context(results)

            logger.info(
                "RAG retrieval complete",
                query_preview=query[:50],
                results_count=len(results),
                context_length=len(context),
            )

            return context, sources

        except Exception as e:
            logger.error("RAG retrieval failed", error=str(e), exc_info=True)
            return "", []

    async def _embed_query(self, query: str) -> Tuple[List[float], Optional[Dict]]:
        """Generate dense and sparse embeddings for the query."""
        embedder = self._get_embedder()

        if embedder == "openai":
            # Fallback to OpenAI
            dense = await self._embed_with_openai(query)
            return dense, None

        output = embedder.encode(
            [query],
            return_dense=True,
            return_sparse=True,
            return_colbert_vecs=False,
        )

        dense_vec = output["dense_vecs"][0].tolist()
        sparse_weights = output["lexical_weights"][0]

        return dense_vec, sparse_weights

    async def _embed_with_openai(self, text: str) -> List[float]:
        """Fallback embedding using OpenAI."""
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=text,
        )
        return response.data[0].embedding

    async def _search_qdrant(
        self,
        query_dense: List[float],
        query_sparse: Optional[Dict],
        user_id: str,
        document_id: Optional[str],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search (dense + sparse) in Qdrant.
        Falls back to dense-only if sparse vectors not available.
        """
        try:
            qdrant = self._get_qdrant()
            from qdrant_client.models import Filter, FieldCondition, MatchValue, SparseVector

            # Build filter: always filter by user_id, optionally by document_id
            filter_conditions = [
                FieldCondition(key="user_id", match=MatchValue(value=user_id))
            ]
            if document_id:
                filter_conditions.append(
                    FieldCondition(key="document_id", match=MatchValue(value=document_id))
                )

            search_filter = Filter(must=filter_conditions)

            if query_sparse and not isinstance(self._get_embedder(), str):
                # Hybrid search with dense + sparse vectors
                from qdrant_client.models import Prefetch, FusionQuery, Fusion

                prefetch_dense = Prefetch(
                    query=query_dense,
                    using="dense",
                    filter=search_filter,
                    limit=top_k,
                )

                sparse_indices = [int(k) for k in query_sparse.keys()]
                sparse_values = [float(v) for v in query_sparse.values()]

                prefetch_sparse = Prefetch(
                    query=SparseVector(
                        indices=sparse_indices,
                        values=sparse_values,
                    ),
                    using="sparse",
                    filter=search_filter,
                    limit=top_k,
                )

                results = qdrant.query_points(
                    collection_name=settings.qdrant_collection_name,
                    prefetch=[prefetch_dense, prefetch_sparse],
                    query=FusionQuery(fusion=Fusion.RRF),
                    limit=top_k,
                    with_payload=True,
                ).points
            else:
                # Dense-only search (fallback)
                results = qdrant.search(
                    collection_name=settings.qdrant_collection_name,
                    query_vector=("dense", query_dense),
                    query_filter=search_filter,
                    limit=top_k,
                    with_payload=True,
                )

            return [
                {
                    "id": str(point.id),
                    "score": point.score,
                    "text": point.payload.get("text", ""),
                    "document_id": point.payload.get("document_id"),
                    "filename": point.payload.get("filename"),
                    "chunk_index": point.payload.get("chunk_index"),
                    "page_number": point.payload.get("page_number"),
                }
                for point in results
            ]

        except Exception as e:
            logger.error("Qdrant search failed", error=str(e))
            return []

    async def _rerank(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """Rerank results using BGE reranker model."""
        reranker = self._get_reranker()

        if reranker is None or reranker == "disabled":
            return results[:top_k]

        try:
            # Prepare pairs for reranking
            pairs = [(query, result["text"]) for result in results]

            # Score all pairs
            scores = reranker.compute_score(pairs, normalize=True)

            # Attach rerank scores and sort
            for i, result in enumerate(results):
                result["rerank_score"] = float(scores[i])

            reranked = sorted(results, key=lambda x: x["rerank_score"], reverse=True)
            return reranked[:top_k]

        except Exception as e:
            logger.error("Reranking failed", error=str(e))
            return results[:top_k]

    def _assemble_context(
        self, results: List[Dict[str, Any]]
    ) -> Tuple[str, List[Source]]:
        """
        Assemble retrieved chunks into a context string and source list.

        Returns:
            Tuple of (context_text, sources)
        """
        context_parts = []
        sources = []

        for i, result in enumerate(results):
            text = result.get("text", "").strip()
            if not text:
                continue

            # Build context with chunk metadata
            filename = result.get("filename", "Unknown Document")
            page = result.get("page_number")
            page_info = f" (Page {page})" if page else ""

            context_part = f"[Source {i+1}: {filename}{page_info}]\n{text}"
            context_parts.append(context_part)

            # Build source reference
            source = Source(
                document_id=result.get("document_id"),
                document_name=filename,
                chunk_id=result.get("id"),
                page_number=page,
                relevance_score=round(
                    result.get("rerank_score", result.get("score", 0.0)), 4
                ),
                excerpt=text[:300] + ("..." if len(text) > 300 else ""),
            )
            sources.append(source)

        context = "\n\n---\n\n".join(context_parts)
        return context, sources

    async def retrieve_for_document(
        self,
        query: str,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        top_k: int = 15,
    ) -> Tuple[str, List[Source]]:
        """
        Retrieve context specifically from a given document.
        Used for contract analysis where we have a specific document.
        """
        return await self.retrieve(
            query=query,
            user_id=user_id,
            document_id=document_id,
            top_k=top_k,
        )
