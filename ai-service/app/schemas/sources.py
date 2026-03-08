"""Citation and RAG chunk schemas. Badge types match shared/constants/badges.ts."""
from typing import Literal

from pydantic import BaseModel, Field

BadgeType = Literal["government", "academic", "market", "finsight-kb"]
TopicTag = Literal[
    "budgeting", "saving", "debt", "credit", "investing", "emergency-fund", "behavioral"
]


class Source(BaseModel):
    """One citation for an insight or chat message."""
    title: str
    url: str
    preview: str = Field(max_length=300)
    relevance_score: float = Field(ge=0, le=1)
    badge_type: BadgeType


class ChunkMetadata(BaseModel):
    """Metadata for one RAG chunk (stored + returned)."""
    id: str
    source_title: str
    source_url: str
    topic: TopicTag
    badge_type: BadgeType
    chunk_index: int = 0


class Chunk(BaseModel):
    """Full chunk: content + metadata."""
    content: str
    metadata: ChunkMetadata


class RetrievedChunk(BaseModel):
    """Chunk returned from retriever with score."""
    content: str
    source_title: str
    source_url: str
    topic: TopicTag
    badge_type: BadgeType
    relevance_score: float
