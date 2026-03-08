"""Chunk text into 300-500 word segments with overlap. Semantic boundaries where possible."""
import re
import uuid
from typing import Any

from app.config import settings
from app.schemas.sources import BadgeType, Chunk, ChunkMetadata, TopicTag

TARGET = getattr(settings, "chunk_target_words", 400)
OVERLAP = getattr(settings, "chunk_overlap_words", 60)


def _word_count(text: str) -> int:
    return len(text.split())


def _split_into_sentences(text: str) -> list[str]:
    # Simple: split on . ! ? followed by space or end
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p.strip() for p in parts if p.strip()]


def chunk_text(
    text: str,
    *,
    source_title: str,
    source_url: str,
    topic: TopicTag,
    badge_type: BadgeType,
    start_index: int = 0,
) -> list[Chunk]:
    """
    Chunk long text into ~TARGET words with ~OVERLAP word overlap.
    Tries to break on sentence boundaries.
    """
    sentences = _split_into_sentences(text)
    if not sentences:
        return []

    chunks: list[Chunk] = []
    current: list[str] = []
    current_words = 0
    overlap_sentences: list[str] = []
    overlap_words = 0
    idx = start_index

    for sent in sentences:
        w = _word_count(sent) + (1 if current else 0)  # +1 for space
        if current_words + w >= TARGET and current:
            # Flush current chunk
            content = " ".join(current)
            chunk_id = str(uuid.uuid4())
            meta = ChunkMetadata(
                id=chunk_id,
                source_title=source_title,
                source_url=source_url,
                topic=topic,
                badge_type=badge_type,
                chunk_index=idx,
            )
            chunks.append(Chunk(content=content, metadata=meta))
            idx += 1
            # Keep last sentences for overlap
            overlap_sentences = []
            overlap_words = 0
            for s in reversed(current):
                overlap_sentences.insert(0, s)
                overlap_words += _word_count(s) + 1
                if overlap_words >= OVERLAP:
                    break
            current = overlap_sentences.copy()
            current_words = overlap_words
        else:
            current.append(sent)
            current_words += w

    if current:
        content = " ".join(current)
        chunk_id = str(uuid.uuid4())
        meta = ChunkMetadata(
            id=chunk_id,
            source_title=source_title,
            source_url=source_url,
            topic=topic,
            badge_type=badge_type,
            chunk_index=idx,
        )
        chunks.append(Chunk(content=content, metadata=meta))

    return chunks
