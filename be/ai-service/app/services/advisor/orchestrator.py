from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from functools import lru_cache
from typing import Any
from zoneinfo import ZoneInfo

from app.services.advisor.guardrails import apply_output_guardrails
from app.services.advisor.memory_cache import MemoryStore
from app.services.advisor.prompts import build_advisor_system_prompt
from app.services.advisor.retrieval import RetrievalLayer
from app.services.advisor.schemas import AdvisorChatRequest, AdvisorMetrics, AdvisorResponse, AdvisorToolResult, ExtractedEntities, IntentExtraction
from app.services.gemini_service import get_gemini_service


def _to_float(value: object) -> float:
    try:
        parsed = float(value)  # type: ignore[arg-type]
        return 0.0 if parsed != parsed else parsed  # NaN guard
    except (TypeError, ValueError):
        return 0.0

def _total_income(transactions: list[dict]) -> float:
    return round(sum(_to_float(t.get("amount")) for t in transactions if str(t.get("type", "")).upper() in {"INCOME", "THU"}), 2)

def _total_expense(transactions: list[dict]) -> float:
    return round(sum(_to_float(t.get("amount")) for t in transactions if str(t.get("type", "")).upper() in {"EXPENSE", "CHI"}), 2)

def _savings_rate(income: float, expense: float) -> float:
    return round(max(income - expense, 0.0) / income * 100.0, 2) if income > 0 else 0.0

def _roi(current: float, invested: float) -> float:
    return round((current - invested) / invested * 100.0, 2) if invested > 0 else 0.0


ROUTE_INTERNAL_DATA = "internal_data"
ROUTE_EXTERNAL_FINANCIAL_DATA = "external_financial_data"
ROUTE_OUT_OF_SCOPE = "out_of_scope"

INTERNAL_DATA_PATTERN = re.compile(
    r"(chi tieu|chi tiêu|thu nhap|thu nhập|tiet kiem|tiết kiệm|so du|số dư|vi tien|ví tiền|giao dich|giao dịch|ngan sach|ngân sách)",
    re.IGNORECASE,
)
EXTERNAL_FINANCIAL_PATTERN = re.compile(
    r"(gia vang|giá vàng|vang sjc|ty gia|tỷ giá|lai suat|lãi suất|chung khoan|chứng khoán|co phieu|cổ phiếu|usd|eur|btc|bitcoin|crypto|gia xang|giá xăng)",
    re.IGNORECASE,
)
OUT_OF_SCOPE_PATTERN = re.compile(
    r"(thoi tiet|thời tiết|nau an|nấu ăn|bong da|bóng đá|am nhac|âm nhạc|giai tri|giải trí|phim|du lich|du lịch|game)",
    re.IGNORECASE,
)


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

    async def _llm_intent(self, message: str) -> IntentExtraction | None:
        import httpx as _httpx

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None

        from app.services.advisor.prompts import INTENT_ROUTER as _INTENT_ROUTER

        payload = {
            "contents": [{"parts": [{"text": f"{_INTENT_ROUTER}\n\nUser message: {message}"}]}],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 128,
                "responseMimeType": "application/json",
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }

        model = self.model_name
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            f"?key={api_key}"
        )

        try:
            async with _httpx.AsyncClient(timeout=_httpx.Timeout(8.0, connect=3.0)) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
                if not text:
                    return None
                parsed = json.loads(text)
                intent_val = str(parsed.get("intent", "general_knowledge"))
                valid_intents = {"transaction_lookup", "financial_advice", "chart_analysis", "general_knowledge"}
                if intent_val not in valid_intents:
                    intent_val = "general_knowledge"
                confidence = float(parsed.get("confidence", 0.8) or 0.8)
                return IntentExtraction(
                    intent=intent_val,  # type: ignore[arg-type]
                    confidence=min(1.0, max(0.0, confidence)),
                    entities=ExtractedEntities(
                        time_range=parsed.get("time_range") or None,
                        category=parsed.get("category") or None,
                        amount=float(parsed["amount"]) if parsed.get("amount") is not None else None,
                    ),
                )
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
            llm_result = await self._llm_intent(message)
            if llm_result is not None:
                return llm_result
        return self._extract_intent_entities_rule_based(message)

    @staticmethod
    def _route_message(message: str, extraction: IntentExtraction) -> str:
        if INTERNAL_DATA_PATTERN.search(message):
            return ROUTE_INTERNAL_DATA

        if EXTERNAL_FINANCIAL_PATTERN.search(message):
            return ROUTE_EXTERNAL_FINANCIAL_DATA

        if OUT_OF_SCOPE_PATTERN.search(message):
            return ROUTE_OUT_OF_SCOPE

        if extraction.intent in {"transaction_lookup", "chart_analysis", "financial_advice"}:
            return ROUTE_INTERNAL_DATA

        return ROUTE_OUT_OF_SCOPE

    @staticmethod
    def _normalize_text(value: str) -> str:
        return value.strip().lower()

    @staticmethod
    def _format_vi_number(value: float, digits: int = 0) -> str:
        formatted = f"{value:,.{digits}f}"
        return formatted.replace(",", "_").replace(".", ",").replace("_", ".")

    @staticmethod
    def _format_vnd(value: float) -> str:
        return f"{AdvisorOrchestrator._format_vi_number(value, 0)} VND"

    @staticmethod
    def _format_usd(value: float) -> str:
        return f"{AdvisorOrchestrator._format_vi_number(value, 2)} USD"

    @staticmethod
    def _format_rate(value: float, digits: int | None = None) -> str:
        if digits is None:
            digits = 0 if abs(value - round(value)) < 1e-9 else 2
        return AdvisorOrchestrator._format_vi_number(value, digits)

    @staticmethod
    def _format_vi_datetime(value: Any) -> str | None:
        if value in (None, ""):
            return None

        dt: datetime | None = None
        if isinstance(value, (int, float)):
            dt = datetime.fromtimestamp(float(value), tz=timezone.utc)
        elif isinstance(value, str):
            raw = value.strip()
            if not raw:
                return None
            try:
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                try:
                    dt = parsedate_to_datetime(raw)
                except Exception:
                    return None

        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local_dt = dt.astimezone(ZoneInfo("Asia/Ho_Chi_Minh"))
        return local_dt.strftime("lúc %H:%M ngày %d/%m/%Y")

    @classmethod
    def _extract_exchange_pair(cls, message: str) -> tuple[str, str]:
        normalized = cls._normalize_text(message)
        aliases = {
            "usd": "USD",
            "đô": "USD",
            "dollar": "USD",
            "eur": "EUR",
            "euro": "EUR",
            "jpy": "JPY",
            "yen": "JPY",
            "cny": "CNY",
            "nhân dân tệ": "CNY",
            "gbp": "GBP",
            "bảng": "GBP",
            "vnd": "VND",
        }
        detected: list[str] = []
        for alias, code in aliases.items():
            if alias in normalized and code not in detected:
                detected.append(code)

        if len(detected) >= 2:
            return detected[0], detected[1]
        if len(detected) == 1:
            code = detected[0]
            if code == "VND":
                return "USD", "VND"
            return code, "VND"
        return "USD", "VND"

    @classmethod
    def _resolve_exchange_rate(cls, rates: dict[str, Any], base_code: str, source_code: str, target_code: str) -> float | None:
        normalized_base = (base_code or "USD").upper()
        source = source_code.upper()
        target = target_code.upper()
        if source == target:
            return 1.0

        def as_float(code: str) -> float | None:
            value = rates.get(code)
            try:
                return float(value)
            except Exception:
                return None

        if normalized_base == source:
            return as_float(target)
        if normalized_base == target:
            base_to_source = as_float(source)
            if base_to_source and base_to_source != 0:
                return 1 / base_to_source
            return None

        base_to_source = as_float(source)
        base_to_target = as_float(target)
        if base_to_source and base_to_target and base_to_source != 0:
            return base_to_target / base_to_source
        return None

    @staticmethod
    def _empty_tool_result() -> AdvisorToolResult:
        return AdvisorToolResult(
            structured_data={},
            unstructured_context=[],
            external_data={},
        )

    @staticmethod
    def _build_fallback_response(route: str) -> str:
        if route == ROUTE_OUT_OF_SCOPE:
            return "Mình là trợ lý tài chính Fin, mình chỉ có thể hỗ trợ các vấn đề về quản lý tiền bạc và đầu tư thôi nhé."

        return (
            "Mình chưa lấy được dữ liệu thị trường mới nhất ngay lúc này. Bạn thử lại sau ít phút nhé."
        )

    @classmethod
    def _build_external_financial_response(cls, message: str, external_data: dict[str, Any]) -> str:
        normalized = cls._normalize_text(message)
        exchange_data = external_data.get("exchange") if isinstance(external_data, dict) else None
        gold_data = external_data.get("gold") if isinstance(external_data, dict) else None
        domestic_gold_data = external_data.get("domestic_gold") if isinstance(external_data, dict) else None

        if "vàng" in normalized or "vang" in normalized or "xau" in normalized:
            if isinstance(domestic_gold_data, dict) and domestic_gold_data:
                buy_price = domestic_gold_data.get("buy_vnd_per_luong")
                sell_price = domestic_gold_data.get("sell_vnd_per_luong")
                updated_at = cls._format_vi_datetime(domestic_gold_data.get("updated_at"))
                if isinstance(buy_price, (int, float)) and isinstance(sell_price, (int, float)):
                    answer = (
                        f"Giá vàng SJC hiện tại mua vào {cls._format_vnd(float(buy_price))}/lượng, "
                        f"bán ra {cls._format_vnd(float(sell_price))}/lượng"
                    )
                    if updated_at:
                        answer += f", cập nhật {updated_at}."
                    else:
                        answer += "."
                    return answer

            price_usd = None
            updated_at = None
            if isinstance(gold_data, dict):
                try:
                    price_usd = float(gold_data.get("price_usd_per_ounce"))
                except Exception:
                    price_usd = None
                updated_at = cls._format_vi_datetime(gold_data.get("updated_at")) or gold_data.get("updated_at_readable")

            if price_usd is not None and price_usd > 0:
                answer = f"Giá vàng thế giới hiện khoảng {cls._format_usd(price_usd)}/ounce"

                if isinstance(exchange_data, dict):
                    rates = exchange_data.get("rates") if isinstance(exchange_data.get("rates"), dict) else {}
                    usd_vnd = cls._resolve_exchange_rate(rates, str(exchange_data.get("base_code") or "USD"), "USD", "VND")
                    if usd_vnd:
                        vnd_per_luong = price_usd * usd_vnd * 37.5 / 31.1034768
                        answer += f", tương đương khoảng {cls._format_vnd(vnd_per_luong)}/lượng theo giá thế giới quy đổi"

                if updated_at:
                    answer += f", cập nhật {updated_at}."
                else:
                    answer += "."
                return answer

        if "tỷ giá" in normalized or "ty gia" in normalized or re.search(r"\b(usd|eur|jpy|cny|gbp|vnd)\b", normalized):
            if isinstance(exchange_data, dict) and exchange_data:
                rates = exchange_data.get("rates") if isinstance(exchange_data.get("rates"), dict) else {}
                if rates:
                    source_code, target_code = cls._extract_exchange_pair(normalized)
                    rate = cls._resolve_exchange_rate(rates, str(exchange_data.get("base_code") or "USD"), source_code, target_code)
                    if rate is not None:
                        updated_at = cls._format_vi_datetime(exchange_data.get("updated_at"))
                        rate_digits = 0 if target_code == "VND" else None
                        answer = f"Tỷ giá tham chiếu hiện tại: 1 {source_code} = {cls._format_rate(rate, rate_digits)} {target_code}"
                        if updated_at:
                            answer += f", cập nhật {updated_at}."
                        else:
                            answer += "."
                        return answer

        if isinstance(exchange_data, dict) and exchange_data:
            available_codes = exchange_data.get("rates") if isinstance(exchange_data.get("rates"), dict) else {}
            if available_codes:
                return (
                    "Mình lấy được một phần dữ liệu thị trường rồi, nhưng chưa đủ dữ liệu phù hợp để trả lời chính xác câu này. "
                    "Bạn thử nói rõ mã ngoại tệ hoặc loại vàng cần xem nhé."
                )

        return "Mình chưa lấy được dữ liệu thị trường mới nhất ngay lúc này. Bạn thử lại sau ít phút nhé."

    @staticmethod
    def _empty_metrics() -> AdvisorMetrics:
        return AdvisorMetrics(
            total_income=0,
            total_expense=0,
            savings_rate=0,
            roi=0,
        )

    async def _embed_for_vector_search(self, message: str) -> list[float] | None:
        import httpx as _httpx

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
            f"?key={api_key}"
        )
        payload = {"content": {"parts": [{"text": message}]}}
        try:
            async with _httpx.AsyncClient(timeout=_httpx.Timeout(8.0, connect=3.0)) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                values = data.get("embedding", {}).get("values", [])
                return values if isinstance(values, list) and values else None
        except Exception:
            return None

    @staticmethod
    def _build_calculations(structured_data: dict[str, Any]) -> AdvisorMetrics:
        transactions = list(structured_data.get("transactions", []))
        total_income = _total_income(transactions)
        total_expense = _total_expense(transactions)
        savings = _savings_rate(total_income, total_expense)

        investment = dict(structured_data.get("investment", {}))
        roi = _roi(
            float(investment.get("totalCurrentValue", 0) or 0),
            float(investment.get("totalInvested", 0) or 0),
        )

        return AdvisorMetrics(
            total_income=total_income,
            total_expense=total_expense,
            savings_rate=savings,
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
    ) -> tuple[str, dict[str, Any]]:
        system_prompt = build_advisor_system_prompt(
            financial_profile=req.financial_profile,
            risk_profile=req.risk_profile,
            calculations=calculations.model_dump(),
            tool_context=tool_context,
            short_term_memory=short_term_memory,
        )

        route = str(tool_context.get("route") or "unknown")

        if route == ROUTE_EXTERNAL_FINANCIAL_DATA:
            return self._build_external_financial_response(req.message, tool_context.get("external", {})), {}

        should_use_llm = req.use_llm or route == ROUTE_EXTERNAL_FINANCIAL_DATA
        if not should_use_llm:
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                f"Ty le tiet kiem hien tai la {calculations.savings_rate:.2f}% va ROI danh muc la {calculations.roi:.2f}%. "
                "De xuat: gioi han danh muc chi lon nhat, dat auto-saving ngay dau thang, va ra soat lai muc tieu dau tu moi 30 ngay.",
                {},
            )

        # Prefer user's runtime key, fall back to env var
        api_key = (req.gemini_api_key or "").strip() or os.getenv("GEMINI_API_KEY", "").strip()
        model_name = (req.selected_ai_model or "").strip() or self.model_name

        if not api_key:
            if route == ROUTE_EXTERNAL_FINANCIAL_DATA:
                return self._build_external_financial_response(req.message, tool_context.get("external", {})), {}
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                f"Ty le tiet kiem la {calculations.savings_rate:.2f}% va ROI la {calculations.roi:.2f}%. "
                "Hay uu tien quy khan cap truoc, sau do toi uu chi tieu danh muc bien dong cao.",
                {},
            )

        try:
            llm_result = await get_gemini_service().generate_advisor_answer(
                question=req.message,
                system_prompt=system_prompt,
                tool_context={
                    **tool_context,
                    "intent": extraction.intent,
                    "entities": extraction.entities.model_dump(),
                },
                model_override=model_name,
                api_key_override=api_key,
                use_google_search=route == ROUTE_EXTERNAL_FINANCIAL_DATA,
            )
            if llm_result and isinstance(llm_result.get("answer"), str):
                answer_text = str(llm_result.get("answer") or "").strip()
                llm_meta = {
                    "model": llm_result.get("model", model_name),
                    "usage": llm_result.get("usage", {}),
                    "grounding_sources": llm_result.get("grounding_sources", []),
                }
                return answer_text, llm_meta
            if route == ROUTE_EXTERNAL_FINANCIAL_DATA:
                return self._build_external_financial_response(req.message, tool_context.get("external", {})), {}
        except Exception:
            if route == ROUTE_EXTERNAL_FINANCIAL_DATA:
                return self._build_external_financial_response(req.message, tool_context.get("external", {})), {}
            return (
                f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
                f"Ty le tiet kiem la {calculations.savings_rate:.2f}% va ROI la {calculations.roi:.2f}%. "
                "Khuyen nghi ngay: dat gioi han chi tieu theo danh muc lon nhat va tu dong chuyen 20-25% thu nhap vao tiet kiem.",
                {},
            )

        return (
            f"Ban dang co tong thu {calculations.total_income:,.0f} va tong chi {calculations.total_expense:,.0f}. "
            f"Ty le tiet kiem la {calculations.savings_rate:.2f}% va ROI la {calculations.roi:.2f}%. "
            "Khuyen nghi ngay: dat gioi han chi tieu theo danh muc lon nhat va tu dong chuyen 20-25% thu nhap vao tiet kiem.",
            {},
        )

    async def run(self, req: AdvisorChatRequest) -> AdvisorResponse:
        cache_key = self._cache_key(req)
        cached = None if EXTERNAL_FINANCIAL_PATTERN.search(req.message) else await self.memory.get_cached_answer(cache_key)
        if cached:
            return AdvisorResponse.model_validate(cached)

        self.memory.session_memory.append(req.session_id, "user", req.message)

        extraction = await self._extract_intent_entities(req.message, allow_llm=req.use_llm)
        route = self._route_message(req.message, extraction)

        tool_result = self._empty_tool_result()
        calculations = self._empty_metrics()

        if route == ROUTE_INTERNAL_DATA:
            embedding = await self._embed_for_vector_search(req.message)
            tool_result = await self.retrieval.execute(
                user_id=req.user_id,
                message=req.message,
                intent=extraction.intent,
                entities=extraction.entities,
                embedding_vector=embedding,
            )
            calculations = self._build_calculations(tool_result.structured_data)
        elif route == ROUTE_EXTERNAL_FINANCIAL_DATA:
            tool_result = AdvisorToolResult(
                structured_data={},
                unstructured_context=[],
                external_data=await self.retrieval.fetch_external_data(),
            )

        long_term_prefs = await self.memory.get_user_preferences(req.user_id)
        merged_profile = {**long_term_prefs, **req.financial_profile}

        if route == ROUTE_OUT_OF_SCOPE:
            answer = self._build_fallback_response(route)
            llm_meta: dict[str, Any] = {}
        else:
            answer, llm_meta = await self._generate_advice(
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
                    "route": route,
                },
                short_term_memory=self.memory.session_memory.get(req.session_id),
            )

        guard = apply_output_guardrails(answer)
        final_answer = str(guard["sanitized_answer"])

        self.memory.session_memory.append(req.session_id, "assistant", final_answer)
        await self.memory.upsert_user_preferences(req.user_id, merged_profile)

        response = AdvisorResponse(
            answer=final_answer,
            intent=route,
            confidence=extraction.confidence,
            entities=extraction.entities,
            calculations=calculations,
            tool_result=tool_result,
            guardrails=guard,
            llm=llm_meta,
            memory={
                "session_id": req.session_id,
                "short_term_count": len(self.memory.session_memory.get(req.session_id)),
                "long_term_profile": merged_profile,
            },
        )

        await self.memory.set_cached_answer(cache_key, response.model_dump(), ttl_seconds=20 if route == ROUTE_EXTERNAL_FINANCIAL_DATA else 120)
        return response


@lru_cache(maxsize=1)
def get_advisor_orchestrator() -> AdvisorOrchestrator:
    return AdvisorOrchestrator()
