"""Format citations as inline pills or append source list. For chat responses."""
from __future__ import annotations

from app.schemas.sources import RetrievedChunk, Source


def chunks_to_sources(chunks: list[RetrievedChunk], max_preview_len: int = 200) -> list[Source]:
    seen = set()
    out: list[Source] = []
    for c in chunks:
        key = (c.source_title, c.source_url)
        if key in seen:
            continue
        seen.add(key)
        preview = c.content[:max_preview_len] + ("..." if len(c.content) > max_preview_len else "")
        out.append(
            Source(
                title=c.source_title,
                url=c.source_url,
                preview=preview,
                relevance_score=c.relevance_score,
                badge_type=c.badge_type,
            )
        )
    return out


def format_chat_sources(sources: list[Source]) -> str:
    """Append a short 'Sources:' line for chat UI to render as pills."""
    if not sources:
        return ""
    lines = ["Sources:"]
    for s in sources:
        lines.append(f"- [{s.title}]({s.url})")
    return "\n".join(lines)
