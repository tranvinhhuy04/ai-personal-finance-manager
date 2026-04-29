from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AdvisorChatRequest(BaseModel):
    user_id: str = Field(..., description="Authenticated user id")
    session_id: str = Field(..., description="Chat session id")
    message: str = Field(..., min_length=2)
    locale: str = Field(default="vi-VN")
    risk_profile: str | None = Field(default=None)
    financial_profile: dict[str, Any] = Field(default_factory=dict)
    use_llm: bool = Field(default=True)


class ExtractedEntities(BaseModel):
    time_range: str | None = Field(default=None, description="thang_truoc, nam_nay, custom")
    category: str | None = None
    amount: float | None = None


class IntentExtraction(BaseModel):
    intent: Literal["transaction_lookup", "financial_advice", "chart_analysis", "general_knowledge"]
    confidence: float = Field(ge=0, le=1)
    entities: ExtractedEntities = Field(default_factory=ExtractedEntities)


class AdvisorToolResult(BaseModel):
    structured_data: dict[str, Any] = Field(default_factory=dict)
    unstructured_context: list[dict[str, Any]] = Field(default_factory=list)
    external_data: dict[str, Any] = Field(default_factory=dict)


class AdvisorMetrics(BaseModel):
    total_income: float
    total_expense: float
    savings_rate: float
    roi: float


class AdvisorResponse(BaseModel):
    answer: str
    intent: str
    confidence: float
    entities: ExtractedEntities
    calculations: AdvisorMetrics
    tool_result: AdvisorToolResult
    guardrails: dict[str, Any] = Field(default_factory=dict)
    memory: dict[str, Any] = Field(default_factory=dict)
