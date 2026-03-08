"""FinSight AI service — strategy, chat, market. Person 3."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, market, strategy


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load FAISS index if present (optional; retriever can lazy-load)
    yield
    # Teardown if needed
    pass


app = FastAPI(
    title="FinSight AI Service",
    description="RAG, strategy engine, chat, market data. Person 3.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(strategy.router, prefix="/strategy", tags=["strategy"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(market.router, prefix="/market", tags=["market"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}
