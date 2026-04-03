from __future__ import annotations

import os
from contextlib import suppress
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints.ai import router as ai_router
from app.services.nlp_service import get_nlp_service

load_dotenv(Path(__file__).resolve().parents[1] / '.env')


def _parse_cors_origins() -> list[str]:
    """Cho phép FE React gọi trực tiếp vào AI service.

    Có thể override bằng biến môi trường CORS_ORIGINS theo format:
    http://localhost:5173,http://127.0.0.1:5173
    """
    raw_value = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


app = FastAPI(
    title="ai-service",
    version="1.1.0",
    description="Chatbot/LLM orchestration service for personal finance. Invoice OCR now lives in the Node.js invoice service.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])


@app.on_event("startup")
async def warm_up_models() -> None:
    """Warm-up model theo nhu cầu để tránh tốn RAM ngay khi container boot.

    Set AI_SERVICE_PRELOAD_MODELS=true nếu muốn tải model từ lúc startup.
    Mặc định để false nhằm giảm peak memory trong Docker.
    """
    preload = os.getenv("AI_SERVICE_PRELOAD_MODELS", "false").lower() == "true"
    if not preload:
        return

    with suppress(Exception):
        get_nlp_service()


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "ai-service",
        "message": "AI service is running",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-service",
    }
