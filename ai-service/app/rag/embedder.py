"""Sentence Transformer embeddings. Lazy-load model."""
from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from app.config import settings


class Embedder:
    _model = None

    @classmethod
    def _get_model(cls):
        if cls._model is None:
            from sentence_transformers import SentenceTransformer
            cls._model = SentenceTransformer(settings.embedding_model)
        return cls._model

    @classmethod
    def embed(cls, texts: list[str]) -> NDArray[np.float32]:
        model = cls._get_model()
        return model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    @classmethod
    def embed_single(cls, text: str) -> NDArray[np.float32]:
        return cls.embed([text])[0]
