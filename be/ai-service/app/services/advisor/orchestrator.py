from __future__ import annotations

import hashlib
import json
import os
import re
from functools import lru_cache
from typing import Any

from app.services.advisor.financial_math import (
    compute_roi,
    compute_savings_rate,
    compute_total_expense,
    compute_total_income,
)
from app.services.advisor.guardrails import apply_output_guardrails
from app.services.advisor.memory_cache import MemoryStore
from app.services.advisor.prompts import build_advisor_system_prompt
from app.services.advisor.retrieval import RetrievalLayer
from app.services.advisor.schemas import AdvisorChatRequest, AdvisorMetrics, AdvisorResponse, ExtractedEntities, IntentExtraction


class AdvisorOrchestrator:
    def __init__(self) -> None:
        self.retrieval = RetrievalLayer()
        self.memory = MemoryStore()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    @staticmethod
    def _cache_key(req: AdvisorChatRequest) -> str:
        raw = json.dumps(
            {
                "user_id": req.user_id,
                "session_id": req.session_id,
                "message": req.message,
                "risk_profile": req.risk_profile,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        return "advisor:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def _extract_intent_entities_with_llm(self, message: str) -> IntentExtraction | None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None

        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.messages import HumanMessage, SystemMessage
        except Exception:
            return None

        llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=api_key,
            temperature=0.0,
            max_retries=0,
            timeout=8,
        )
        extractor = llm.with_structured_output(IntentExtraction)

        prompt = (
            "Classify user intent and extract entities exactly. "
            "Valid intent: transaction_lookup | financial_advice | chart_analysis | general_knowledge. "
            "Entities to extract: time_range, category, amount."
        )

        try:
            response = await extractor.ainvoke(
                [
                    SystemMessage(content=prompt),
                    HumanMessage(content=message),
                ]
            )
            return response
        except Exception:
            return None

    @staticmethod
    def _extract_intent_entities_rule_based(message: str) -> IntentExtraction:
        lowered = message.lower()

        if re.search(r"(chi tieu|giao dich|thu chi|bao nhieu tien)", lowered):
            intent = "transaction_lookup"
        elif re.search(r"(bieu do|xu huong|chart|trend)", lowered):
            intent = "chart_analysis"
        elif re.search(r"(goi y|loi khuyen|toi uu|ke hoach)", lowered):
            intent = "financial_advice"
        else:
            intent = "general_knowledge"

        time_range = None
        if "thang truoc" in lowered:
            time_range = "thang_truoc"
        elif "nam nay" in lowered:
            time_range = "nam_nay"
        elif "thang nay" in lowered:
            time_range = "thang_nay"

        amount_match = re.search(r"(\d+[\.,]?\d*)\s*(k|tr|m|ty|vnd|dong)?", lowered)
        amount = None
        if amount_match:
            base = float(amount_match.group(1).replace(",", ""))
            unit = amount_match.group(2) or ""
            multiplier = {
                "k": 1_000,
                "tr": 1_000_000,
                "m": 1_000_000,
                "ty": 1_000_000_000,
            }.get(unit, 1)
            amount = base * multiplier

        category = None
        for candidate in ["an uong", "dau tu", "di chuyen", "giai tri", "mua sam", "hoc tap"]:
            if candidate in lowered:
                category = candidate
                break

        return IntentExtraction(
            intent=intent,  # type: ignore[arg-type]
            confidence=0.7,
            entities=ExtractedEntities(time_range=time_range, category=category, amount=amount),
        )

    async def _extract_intent_entities(self, message: str, allow_llm: bool) -> IntentExtraction:
        if allow_llm:
            llm_result = await self._extract_intent_entities_with_llm(message)
            if llm_result is not None:
                return llm_result
        return self._extract_intent_entities_rule_based(message)

    async def _embed_for_vector_search(self, message: str) -> list[float] | None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None

        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
        except Exception:
            return None

        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=api_key,
        )
        try:
            return embeddings.embed_query(message)
        except Exception:
            return None

    @staticmethod
    def _build_calculations(structured_data: dict[str, Any]) -> AdvisorMetrics:
        transactions = list(structured_data.get("transactions", []))
        total_income = compute_total_income(transactions)
        total_expense = compute_total_expense(transactions)
        savings_rate = compute_savings_rate(total_income, total_expense)

        investment = dict(structured_data.get("investment", {}))
        roi = compute_roi(
            float(investment.get("totalCurrentValue", 0) or 0),
            float(investment.get("totalInvested", 0) or 0),
        )

        return AdvisorMetrics(
            total_income=total_income,
            total_expense=total_expense,
            savings_rate=savings_rate,
            roi=roi,
        )

    async def _generate_advice(
        self,
        *,
        req: AdvisorChatRequest,
        extraction: IntentExtraction,
        calculations: AdvisorMetrics,
        tool_context: dict[str, Any],
        short_term_memory: list[dict[str, Any]],
    ) -> str:
        system_prompt = build_advisor_system_prompt(
            financial_profile=req.financial_profile,
            risk_profile=req.risk_profile,
            calculations=calculations.model_dump(),
            tool_context=tool_context,
            short_term_memory=short_term_memory,
        )

        if not req.use_llm:
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                f"Ty le tiet kiem hien tai la {calculations.savings_rate:.2f}% va ROI danh muc la {calculations.roi:.2f}%. "
                "De xuat: gioi han danh muc chi lon nhat, dat auto-saving ngay dau thang, va ra soat lai muc tieu dau tu moi 30 ngay."
            )

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                f"Ty le tiet kiem la {calculations.savings_rate:.2f}% va ROI la {calculations.roi:.2f}%. "
                "Hay uu tien quy khan cap truoc, sau do toi uu chi tieu danh muc bien dong cao."
            )

        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.messages import HumanMessage, SystemMessage
        except Exception:
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                "Hay uu tien hanh dong tiet kiem theo ngan sach 50/30/20 trong 30 ngay toi."
            )

        llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=api_key,
            temperature=0.2,
            max_retries=0,
            timeout=12,
        )

        human_prompt = (
            f"Cau hoi: {req.message}\n"
            f"Intent: {extraction.intent}\n"
            f"Entities: {json.dumps(extraction.entities.model_dump(), ensure_ascii=False)}\n"
            f"Tool context: {json.dumps(tool_context, ensure_ascii=False)}"
        )

        try:
            response = await llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt),
            ])
            content = response.content
            if isinstance(content, str):
                return content.strip()
            return str(content)
        except Exception:
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                f"Ty le tiet kiem la {calculations.savings_rate:.2f}% va ROI la {calculations.roi:.2f}%. "
                "Khuyen nghi ngay: dat gioi han chi tieu theo danh muc lon nhat va tu dong chuyen 20-25% thu nhap vao tiet kiem."
            )

    async def run(self, req: AdvisorChatRequest) -> AdvisorResponse:
        cache_key = self._cache_key(req)
        cached = await self.memory.get_cached_answer(cache_key)
        if cached:
            return AdvisorResponse.model_validate(cached)

        self.memory.session_memory.append(req.session_id, "user", req.message)

        extraction = await self._extract_intent_entities(req.message, allow_llm=req.use_llm)
        embedding = await self._embed_for_vector_search(req.message)

        tool_result = await self.retrieval.execute(
            user_id=req.user_id,
            message=req.message,
            intent=extraction.intent,
            entities=extraction.entities,
            embedding_vector=embedding,
        )

        calculations = self._build_calculations(tool_result.structured_data)

        long_term_prefs = await self.memory.get_user_preferences(req.user_id)
        merged_profile = {**long_term_prefs, **req.financial_profile}

        answer = await self._generate_advice(
            req=AdvisorChatRequest(
                **{
                    **req.model_dump(),
                    "financial_profile": merged_profile,
                }
            ),
            extraction=extraction,
            calculations=calculations,
            tool_context={
                "structured": tool_result.structured_data,
                "unstructured": tool_result.unstructured_context,
                "external": tool_result.external_data,
            },
            short_term_memory=self.memory.session_memory.get(req.session_id),
        )

        guard = apply_output_guardrails(answer)
        final_answer = str(guard["sanitized_answer"])

        self.memory.session_memory.append(req.session_id, "assistant", final_answer)
        await self.memory.upsert_user_preferences(req.user_id, merged_profile)

        response = AdvisorResponse(
            answer=final_answer,
            intent=extraction.intent,
            confidence=extraction.confidence,
            entities=extraction.entities,
            calculations=calculations,
            tool_result=tool_result,
            guardrails=guard,
            memory={
                "session_id": req.session_id,
                "short_term_count": len(self.memory.session_memory.get(req.session_id)),
                "long_term_profile": merged_profile,
            },
        )

        await self.memory.set_cached_answer(cache_key, response.model_dump())
        return response


@lru_cache(maxsize=1)
def get_advisor_orchestrator() -> AdvisorOrchestrator:
    return AdvisorOrchestrator()
