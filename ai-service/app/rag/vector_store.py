"""FAISS index + docstore for RAG chunks. Persist to kb/index/."""
from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray

from app.config import settings
from app.rag.embedder import Embedder
from app.schemas.sources import Chunk, RetrievedChunk, TopicTag


class VectorStore:
    def __init__(self, index_dir: Path | None = None):
        self.index_dir = index_dir or settings.kb_index_dir
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self._index = None
        self._docstore: list[dict[str, Any]] = []
        self._id_to_pos: dict[str, int] = {}
        self._load_if_exists()

    def _path_index(self) -> Path:
        return self.index_dir / "faiss.index"

    def _path_docstore(self) -> Path:
        return self.index_dir / "docstore.pkl"

    def _load_if_exists(self) -> None:
        if self._path_index().exists() and self._path_docstore().exists():
            import faiss
            self._index = faiss.read_index(str(self._path_index()))
            with open(self._path_docstore(), "rb") as f:
                self._docstore = pickle.load(f)
            self._id_to_pos = {d["metadata"]["id"]: i for i, d in enumerate(self._docstore)}

    def add(self, chunks: list[Chunk], vectors: NDArray[np.float32]) -> None:
        import faiss
        if vectors.size == 0:
            return
        if vectors.ndim == 1:
            vectors = vectors.reshape(1, -1)
        start = len(self._docstore)
        for i, ch in enumerate(chunks):
            self._docstore.append({
                "content": ch.content,
                "metadata": ch.metadata.model_dump(),
            })
            self._id_to_pos[ch.metadata.id] = start + i
        if self._index is None:
            self._index = faiss.IndexFlatIP(vectors.shape[1])  # inner product for normalized vectors
        # FAISS typically uses L2; sentence-transformers are L2-normalized so Inner Product = cosine sim
        faiss.normalize_L2(vectors)
        self._index.add(vectors.astype(np.float32))

    def search(
        self,
        query_vector: NDArray[np.float32],
        k: int = 4,
        topic_filter: list[TopicTag] | None = None,
    ) -> list[RetrievedChunk]:
        if self._index is None or len(self._docstore) == 0:
            return []
        if query_vector.ndim == 1:
            query_vector = query_vector.reshape(1, -1)
        import faiss
        faiss.normalize_L2(query_vector)
        k = min(k, self._index.ntotal)
        scores, indices = self._index.search(query_vector.astype(np.float32), k)
        out: list[RetrievedChunk] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            doc = self._docstore[idx]
            meta = doc["metadata"]
            if topic_filter and meta.get("topic") not in topic_filter:
                continue
            # Convert inner product to 0-1 (cosine sim is in [-1,1], typically [0,1] for similar text)
            rel = float((score + 1) / 2) if score <= 1 else min(1.0, float(score))
            rel = max(0.0, min(1.0, rel))
            out.append(
                RetrievedChunk(
                    content=doc["content"],
                    source_title=meta["source_title"],
                    source_url=meta["source_url"],
                    topic=meta["topic"],
                    badge_type=meta["badge_type"],
                    relevance_score=round(rel, 3),
                )
            )
        return out[:k]

    def save(self) -> None:
        if self._index is None:
            return
        import faiss
        faiss.write_index(self._index, str(self._path_index()))
        with open(self._path_docstore(), "wb") as f:
            pickle.dump(self._docstore, f)
