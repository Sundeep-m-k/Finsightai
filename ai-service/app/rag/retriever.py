"""Retrieve top-k chunks by query (and optional topic filter)."""
from __future__ import annotations

from app.config import settings
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore
from app.schemas.sources import RetrievedChunk, TopicTag


def retrieve(
    query: str,
    topic_filter: list[TopicTag] | None = None,
    k: int | None = None,
) -> list[RetrievedChunk]:
    k = k or settings.retrieval_top_k
    store = VectorStore()
    qv = Embedder.embed_single(query)
    return store.search(qv, k=k, topic_filter=topic_filter)
