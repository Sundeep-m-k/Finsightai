"""Retrieve top-k chunks by query (and optional topic filter)."""
from __future__ import annotations

from app.config import settings
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore
from app.schemas.sources import RetrievedChunk, TopicTag

# Singleton — loaded once at import time, reused on every request
_store: VectorStore | None = None


def _get_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store


def warmup() -> None:
    """Pre-load the FAISS index and embedding model at startup."""
    _get_store()
    Embedder.embed_single("warmup")


def retrieve(
    query: str,
    topic_filter: list[TopicTag] | None = None,
    k: int | None = None,
) -> list[RetrievedChunk]:
    k = k or settings.retrieval_top_k
    store = _get_store()
    qv = Embedder.embed_single(query)
    return store.search(qv, k=k, topic_filter=topic_filter)
