from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.nlp_service import get_nlp_service

router = APIRouter()


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Câu hỏi tiếng Việt của người dùng")
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Dữ liệu tài chính đã lấy từ analytics-service/wallet-service để AI trả lời tốt hơn",
    )
    use_llm: bool = Field(
        default=False,
        description="Nếu true và có GEMINI_API_KEY, service sẽ thử gọi Gemini để sinh câu trả lời tự nhiên hơn.",
    )


@router.post("/ocr")
async def ocr_invoice() -> dict[str, Any]:
    """Legacy endpoint kept only to guide old clients to the new Node.js Vision+Gemini flow."""
    raise HTTPException(
        status_code=410,
        detail="Invoice OCR has moved to POST /api/v1/invoices/extract in the Node.js transaction service.",
    )


@router.post("/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    """Classify intent bằng embedding PhoBERT và trả về skeleton trả lời chatbot."""
    try:
        result = await get_nlp_service().answer_question(
            question=payload.question,
            context=payload.context,
            use_llm=payload.use_llm,
        )
        return {"success": True, **result}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể xử lý chatbot: {exc}") from exc
