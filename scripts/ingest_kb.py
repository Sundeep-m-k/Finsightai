#!/usr/bin/env python3
"""Build RAG index from ai-service kb/raw. Run from repo root: python scripts/ingest_kb.py"""
import sys
from pathlib import Path

# Add ai-service to path so app is importable
repo_root = Path(__file__).resolve().parent.parent
ai_service = repo_root / "ai-service"
sys.path.insert(0, str(ai_service))

from app.rag.ingest import run_ingest
from app.config import settings

if __name__ == "__main__":
    n = run_ingest(raw_dir=settings.kb_raw_dir, index_dir=settings.kb_index_dir)
    print(f"Ingested {n} chunks. Index at {settings.kb_index_dir}")
