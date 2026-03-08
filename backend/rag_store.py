import os
from pathlib import Path
from typing import List
from functools import lru_cache

from langchain_community.document_loaders import PyMuPDFLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
KB_DIR = BASE_DIR / "knowledge_base"
INTERNAL_DIR = KB_DIR / "internal"
PDF_DIR = KB_DIR / "pdfs"
VECTOR_DIR = KB_DIR / "vector_store"

EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")


class SentenceTransformerEmbeddings(Embeddings):
    def __init__(self, model_name: str):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def embed_query(self, text: str) -> List[float]:
        vector = self.model.encode(text, normalize_embeddings=True)
        return vector.tolist()

@lru_cache(maxsize=1)
def _embedding_model() -> Embeddings:
    return SentenceTransformerEmbeddings(EMBED_MODEL_NAME)




def _load_internal_docs():
    docs = []
    if INTERNAL_DIR.exists():
        for path in INTERNAL_DIR.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".md", ".txt"}:
                loader = TextLoader(str(path), encoding="utf-8")
                file_docs = loader.load()
                for d in file_docs:
                    d.metadata["source"] = path.name
                    d.metadata["doc_type"] = "internal"
                docs.extend(file_docs)
    return docs


def _load_pdf_docs():
    docs = []
    if PDF_DIR.exists():
        for path in PDF_DIR.rglob("*.pdf"):
            loader = PyMuPDFLoader(str(path))
            file_docs = loader.load()
            for d in file_docs:
                d.metadata["source"] = path.name
                d.metadata["doc_type"] = "pdf"
            docs.extend(file_docs)
    return docs

def _split_docs(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=150,
    )
    return splitter.split_documents(docs)


def build_vector_store(force_rebuild: bool = False):
    VECTOR_DIR.mkdir(parents=True, exist_ok=True)
    index_file = VECTOR_DIR / "index.faiss"

    if index_file.exists() and not force_rebuild:
        return FAISS.load_local(
            str(VECTOR_DIR),
            _embedding_model(),
            allow_dangerous_deserialization=True,
        )

    docs = _load_internal_docs() + _load_pdf_docs()
    print("Total RAG docs loaded:", len(docs))
    for d in docs[:10]:
        print("Loaded source:", d.metadata.get("source"), "doc_type:", d.metadata.get("doc_type"))
    if not docs:
        raise ValueError("No RAG documents found in knowledge_base/internal or knowledge_base/pdfs")

    split_docs = _split_docs(docs)
    store = FAISS.from_documents(split_docs, _embedding_model())
    store.save_local(str(VECTOR_DIR))
    return store

@lru_cache(maxsize=1)
def _cached_vector_store():
    return build_vector_store(force_rebuild=False)


def reindex_knowledge_base():
    _cached_vector_store.cache_clear()
    build_vector_store(force_rebuild=True)
    _cached_vector_store.cache_clear()
    return {"status": "ok", "message": "Knowledge base reindexed"}

def retrieve_chunks(query: str, k: int = 4):
    store = _cached_vector_store()
    retriever = store.as_retriever(search_kwargs={"k": k})
    return retriever.invoke(query)