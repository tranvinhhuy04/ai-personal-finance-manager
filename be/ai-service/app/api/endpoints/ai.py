from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.advisor.orchestrator import get_advisor_orchestrator
from app.services.advisor.schemas import AdvisorChatRequest
from app.services.nlp_service import get_nlp_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str | None = Field(default=None, description="Tin nhắn người dùng do BFF/Gateway gửi sang")
    question: str | None = Field(default=None, description="Alias cũ để giữ tương thích ngược với client hiện tại")
    financialContext: dict[str, Any] = Field(
        default_factory=dict,
        description="Tóm tắt tài chính đáng tin cậy do Node.js BFF lấy từ analytics-service/database",
    )
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Dữ liệu bổ sung để AI trả lời tốt hơn",
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
    """Nhận payload đã được BFF enrich context rồi trả về câu trả lời tài chính chính xác hơn."""
    try:
        resolved_question = (payload.message or payload.question or '').strip()
        if len(resolved_question) < 2:
            raise HTTPException(status_code=400, detail="message/question must contain at least 2 characters")

        merged_context = dict(payload.context or {})
        financial_context = dict(payload.financialContext or {})

        if financial_context:
            merged_context["financialContext"] = financial_context
            merged_context["summary"] = {
                **dict(merged_context.get("summary") or {}),
                "totalIncome": financial_context.get("totalIncome"),
                "totalExpense": financial_context.get("totalExpense"),
                "netCashFlow": financial_context.get("netCashFlow"),
                "net": financial_context.get("netCashFlow"),
            }
            merged_context["topExpenses"] = financial_context.get("topExpenses", [])

        result = await get_nlp_service().answer_question(
            question=resolved_question,
            context=merged_context,
            use_llm=payload.use_llm,
        )
        return {"success": True, **result}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể xử lý chatbot: {exc}") from exc


@router.post("/advisor/chat")
async def advisor_chat(payload: AdvisorChatRequest) -> dict[str, Any]:
    """Agentic RAG + Function Calling pipeline cho Financial Advisor."""
    try:
        result = await get_advisor_orchestrator().run(payload)
        return {
            "success": True,
            "message": result.answer,
            "data": result.model_dump(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Advisor pipeline failed: {exc}") from exc
