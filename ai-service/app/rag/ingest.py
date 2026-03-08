"""
Ingest raw KB content: load from kb/raw, chunk, embed, save to vector store.
Run via: python -m app.rag.ingest
"""
from __future__ import annotations

import json
from pathlib import Path

from app.config import settings
from app.rag.chunker import chunk_text
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore
from app.schemas.sources import BadgeType, Chunk, TopicTag


# (subdir, topic, badge_type). For finsight_kb, topic is overridden by filename stem map below.
RAW_LAYOUT: list[tuple[str, TopicTag, BadgeType]] = [
    ("finsight_kb", "behavioral", "finsight-kb"),
    ("cfpb", "saving", "government"),
    ("investor_gov", "investing", "government"),
    ("openstax", "budgeting", "academic"),
]

# Filename stem -> topic (one folder can have multiple topics)
FINSIGHT_KB_TOPIC: dict[str, TopicTag] = {
    "behavioral": "behavioral",
    "emergency_fund": "emergency-fund",
    "investing": "investing",
    "debt": "debt",
    "budgeting": "budgeting",
}
CFPB_TOPIC: dict[str, TopicTag] = {
    "saving": "saving",
    "credit": "credit",
    "debt": "debt",
    "emergency_savings": "emergency-fund",
}
OPENSTAX_TOPIC: dict[str, TopicTag] = {
    "budgeting": "budgeting",
    "saving": "saving",
    "debt": "debt",
    "credit": "credit",
}


def _read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace").strip()


def _load_raw_chunks(raw_dir: Path) -> list[Chunk]:
    raw_dir = raw_dir or settings.kb_raw_dir
    all_chunks: list[Chunk] = []
    chunk_index = 0

    for subdir, default_topic, badge_type in RAW_LAYOUT:
        dir_path = raw_dir / subdir
        if not dir_path.is_dir():
            continue
        for f in sorted(dir_path.glob("*.md")) + sorted(dir_path.glob("*.txt")):
            text = _read_file(f)
            if not text:
                continue
            if subdir == "finsight_kb":
                topic = FINSIGHT_KB_TOPIC.get(f.stem, default_topic)
            elif subdir == "cfpb":
                topic = CFPB_TOPIC.get(f.stem, default_topic)
            elif subdir == "openstax":
                topic = OPENSTAX_TOPIC.get(f.stem, default_topic)
            else:
                topic = default_topic
            source_title = f"{subdir} – {f.stem}"
            source_url = f"#kb/{subdir}/{f.name}"
            chunks = chunk_text(
                text,
                source_title=source_title,
                source_url=source_url,
                topic=topic,
                badge_type=badge_type,
                start_index=chunk_index,
            )
            all_chunks.extend(chunks)
            chunk_index += len(chunks)

    return all_chunks


def run_ingest(raw_dir: Path | None = None, index_dir: Path | None = None) -> int:
    raw_dir = raw_dir or settings.kb_raw_dir
    index_dir = index_dir or settings.kb_index_dir
    raw_dir.mkdir(parents=True, exist_ok=True)
    index_dir.mkdir(parents=True, exist_ok=True)

    chunks = _load_raw_chunks(raw_dir)
    if not chunks:
        return 0

    vectors = Embedder.embed([c.content for c in chunks])
    store = VectorStore(index_dir=index_dir)
    store.add(chunks, vectors)
    store.save()

    # Optionally write processed manifest
    processed_dir = settings.kb_processed_dir
    processed_dir.mkdir(parents=True, exist_ok=True)
    manifest = [{"id": c.metadata.id, "source_title": c.metadata.source_title, "topic": c.metadata.topic} for c in chunks]
    with open(processed_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return len(chunks)


if __name__ == "__main__":
    n = run_ingest()
    print(f"Ingested {n} chunks.")
