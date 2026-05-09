from __future__ import annotations

import logging
import os
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from app.services.advisor.orchestrator import get_advisor_orchestrator
from app.services.advisor.schemas import AdvisorChatRequest
from app.services.gemini_service import get_gemini_service
from app.services.nlp_service import get_nlp_service
from app.services.ocr_service import process_invoice_image

logger = logging.getLogger(__name__)

router = APIRouter()


class GeminiKeyEntry(BaseModel):
    """Một entry trong pool API Keys — bao gồm plaintext key và index gốc."""
    key: str
    index: int


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
    model: str | None = Field(default=None, description="Model Gemini được user chọn từ settings")
    gemini_api_key: str | None = Field(default=None, description="Gemini API key runtime của user (legacy)")
    gemini_api_keys: Optional[List[GeminiKeyEntry]] = Field(default=None, description="Pool API Keys với auto-rotation")


class ExtractTextRequest(BaseModel):
    input_text: str = Field(..., min_length=2, description="Natural language input or group chat text")
    model: str | None = Field(default=None, description="Model Gemini override từ settings")
    gemini_api_key: str | None = Field(default=None, description="Gemini API key runtime từ settings (legacy)")
    gemini_api_keys: Optional[List[GeminiKeyEntry]] = Field(default=None, description="Pool API Keys với auto-rotation")


class ProviderStatusRequest(BaseModel):
    model: str | None = Field(default=None, description="Model Gemini override từ settings")
    gemini_api_key: str | None = Field(default=None, description="Gemini API key runtime từ settings")
    probe: bool = Field(default=True, description="Nếu true, gọi thử Gemini để xác định trạng thái key/quota")


@router.post("/ocr")
async def ocr_invoice(file: UploadFile = File(...)) -> dict[str, Any]:
    """Extract invoice data from an uploaded image using PaddleOCR (local, offline).

    Accepts any image format supported by OpenCV (JPEG, PNG, WEBP, BMP …).
    Returns the standard JSON expected by the frontend:

        {
            "success": true,
            "data": {
                "merchantName": "...",
                "totalAmount": 58000,
                "transactionDate": "2026-04-03T00:00:00.000Z"
            }
        }
    """
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        extracted = process_invoice_image(image_bytes)
        logger.info(
            "OCR result — merchant=%r  amount=%r  date=%r",
            extracted.get("merchantName"),
            extracted.get("totalAmount"),
            extracted.get("transactionDate"),
        )
        return {"success": True, "data": extracted}

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected OCR error")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc


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
            llm_config={
                "model": payload.model,
                "gemini_api_key": payload.gemini_api_key,
            },
        )
        return {"success": True, **result}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể xử lý chatbot: {exc}") from exc


@router.post("/extract-text")
async def extract_text(payload: ExtractTextRequest) -> dict[str, Any]:
    """Extract financial transactions from free text/group chat.

    Hỗ trợ auto-rotation: khi `gemini_api_keys` (pool) được cung cấp, service sẽ
    tự động thử key tiếp theo nếu key hiện tại bị Quota/Rate-limit (429/403).
    Response trả về thêm `exhausted_key_indices` để gateway persist trạng thái.
    """
    raw_text = payload.input_text.strip()
    if len(raw_text) < 2:
        raise HTTPException(status_code=400, detail="input_text must contain at least 2 characters")

    # Clamp very long input to improve stability while keeping useful context for extraction.
    if len(raw_text) > 4000:
        raw_text = raw_text[:4000]

    gemini = get_gemini_service()

    # Xác định chế độ: pool rotation hay single key
    pool = [entry.model_dump() for entry in payload.gemini_api_keys] if payload.gemini_api_keys else None

    # Cần ít nhất 1 key (pool hoặc single) hoặc server env key
    if not pool and not payload.gemini_api_key and not gemini.is_enabled():
        raise HTTPException(status_code=503, detail="Gemini is not configured. Missing GEMINI_API_KEY")

    try:
        extraction = await gemini.extract_transactions_from_text(
            input_text=raw_text,
            model_override=payload.model,
            api_key_override=payload.gemini_api_key,
            api_keys_override=pool,
        )
        if not extraction:
            extraction = {
                "text": "[]",
                "model": payload.model or gemini.model,
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
                "exhausted_key_indices": [],
            }

        resolved_model = str(extraction.get("model") or payload.model or gemini.model)
        exhausted_indices: list[int] = extraction.get("exhausted_key_indices") or []

        return {
            "success": True,
            "input": raw_text,
            "raw_output": str(extraction.get("text") or ""),
            "model": resolved_model,
            # Trả về danh sách index bị exhausted để gateway persist về identity service
            "exhausted_key_indices": exhausted_indices,
            "llm": {
                "provider": "gemini",
                "model": resolved_model,
                "usage": extraction.get("usage") or {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
            },
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        detail = str(exc)
        lowered = detail.lower()
        if '429' in detail or 'quota' in lowered or 'rate limit' in lowered:
            raise HTTPException(status_code=429, detail=detail) from exc

        # Degrade gracefully for transient/provider parsing failures.
        resolved_model = str(payload.model or gemini.model)
        return {
            "success": True,
            "input": raw_text,
            "raw_output": "[]",
            "model": resolved_model,
            "exhausted_key_indices": [],
            "llm": {
                "provider": "gemini",
                "model": resolved_model,
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể trích xuất từ văn bản: {exc}") from exc


@router.post("/provider-status")
async def provider_status(payload: ProviderStatusRequest) -> dict[str, Any]:
    """Return actual Gemini provider status for current credentials/model.

    This endpoint helps frontend settings reflect real runtime state (ok/quota_exceeded/invalid_key).
    """
    gemini = get_gemini_service()
    status = await gemini.provider_status(
        model_override=payload.model,
        api_key_override=payload.gemini_api_key,
        probe=payload.probe,
    )
    return {
        "success": True,
        **status,
    }


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
