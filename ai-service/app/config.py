"""App config from env. No secrets in code."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Gemini (free tier)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # Finnhub (optional)
    finnhub_api_key: str = ""

    # Paths
    kb_raw_dir: Path = Path(__file__).resolve().parent / "kb" / "raw"
    kb_index_dir: Path = Path(__file__).resolve().parent / "kb" / "index"
    kb_processed_dir: Path = Path(__file__).resolve().parent / "kb" / "processed"

    # RAG
    chunk_target_words: int = 400
    chunk_overlap_words: int = 60
    retrieval_top_k: int = 4
    embedding_model: str = "all-MiniLM-L6-v2"

    # Cache
    macro_cache_ttl_minutes: int = 30

    # Allowed tickers for live quotes
    allowed_tickers: frozenset[str] = frozenset({"VOO", "QQQ", "BND", "SPY", "SCHD"})


settings = Settings()
