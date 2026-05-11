from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Any

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer

from app.services.gemini_service import get_gemini_service

# Regex phát hiện câu hỏi về DANH MỤC chi tiêu cao nhất (category_breakdown)
_CATEGORY_BREAKDOWN_PATTERN = re.compile(
    r'khoản\s*(nào|gì|nhiều)'
    r'|danh\s*mục\s*(nào|gì|nhiều)'
    r'|tiêu\s*nhiều\s*nhất'
    r'|chi\s*nhiều\s*nhất'
    r'|tốn\s*nhiều\s*nhất'
    r'|phần\s*nào\s*nhiều'
    r'|mục\s*nào\s*nhiều'
    r'|breakdown'
    r'|phân\s*loại'
    r'|chủ\s*yếu\s*vào'
    r'|nhiều\s*nhất\s*vào',
    re.IGNORECASE,
)

# Regex phát hiện câu hỏi CHI BAO NHIÊU cho một danh mục cụ thể (specific_category)
# Capture group 1 = tên danh mục
_SPECIFIC_CATEGORY_PATTERN = re.compile(
    r'(?:chi|tiêu|tốn)\s+(?:bao\s+nhiêu|mấy)\s*(?:tiền\s*)?(?:cho|vào|vào\s+khoản|vào\s+mục)\s+(.+?)(?:\?|$)',
    re.IGNORECASE,
)

# Regex phát hiện câu hỏi về DỮ LIỆU THỊ TRƯỜNG (market_query)
_MARKET_QUERY_PATTERN = re.compile(
    r'giá\s*vàng'
    r'|tỷ\s*giá'
    r'|lãi\s*suất'
    r'|chứng\s*khoán'
    r'|cổ\s*phiếu'
    r'|bitcoin|crypto|btc|eth\b'
    r'|giá\s*xăng'
    r'|usd|eur|jpy',
    re.IGNORECASE,
)

PHOBERT_MODEL_NAME = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
INTENT_EXAMPLES = {
    "query_spending": [
        "Tổng chi tiêu tháng này là bao nhiêu?",
        "Tôi đã tiêu bao nhiêu tiền trong tháng này?",
        "Chi tiêu cho ăn uống tháng này thế nào?",
        "Tháng này tôi tiêu nhiều nhất vào khoản gì?",
        "Danh mục nào tôi chi nhiều nhất?",
        "Tôi tốn nhiều nhất vào mục nào?",
        "Khoản nào chiếm nhiều chi phí nhất tháng này?",
        "Chi tiêu theo danh mục tháng này như thế nào?",
        "Tôi đã chi bao nhiêu tiền cho ăn uống?",
        "Tháng này chi cho mua sắm bao nhiêu tiền?",
        "Chi bao nhiêu tiền cho di chuyển?",
    ],
    "query_income": [
        "Thu nhập tháng này là bao nhiêu?",
        "Tôi nhận được bao nhiêu tiền trong tháng này?",
        "Nguồn thu nhập gần đây của tôi là gì?",
        "Dòng tiền vào tháng này ra sao?",
    ],
    "query_savings": [
        "Tôi tiết kiệm được bao nhiêu tiền tháng này?",
        "Tháng này tôi để dành được bao nhiêu?",
        "Tiết kiệm của tôi tháng này là bao nhiêu?",
        "Còn lại bao nhiêu tiền sau khi chi tiêu tháng này?",
        "Tôi đang tiết kiệm được bao nhiêu phần trăm thu nhập?",
    ],
    "market_query": [
        "Giá vàng SJC hôm nay là bao nhiêu?",
        "Tỷ giá USD hôm nay thế nào?",
        "Giá vàng thế giới mới nhất là bao nhiêu?",
        "Lãi suất tiết kiệm ngân hàng hiện tại là bao nhiêu?",
    ],
    "financial_advice": [
        "Làm sao để tiết kiệm 20% lương mỗi tháng?",
        "Hãy cho tôi lời khuyên tài chính cá nhân",
        "Tôi nên tối ưu ngân sách như thế nào?",
        "Tôi có đang chi tiêu hợp lý không?",
        "Tôi nên cắt giảm khoản nào để tiết kiệm hơn?",
    ],
}

# Giới hạn thread của PyTorch để giảm CPU/RAM peak trong Docker.
torch.set_num_threads(max(1, int(os.getenv("TORCH_NUM_THREADS", "1"))))


class NLPService:
    """NLP service using PhoBERT embeddings and cosine similarity for intent routing."""

    def __init__(self) -> None:
        self.tokenizer = None
        self.model = None
        self.intent_centroids: dict[str, torch.Tensor] = {}

    def _ensure_model_loaded(self) -> None:
        if self.model is not None and self.tokenizer is not None:
            return

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(PHOBERT_MODEL_NAME)
            self.model = AutoModel.from_pretrained(PHOBERT_MODEL_NAME)
            self.model.eval()
            self._build_intent_centroids()
        except Exception as exc:
            raise RuntimeError(
                "Không thể tải PhoBERT. Hãy kiểm tra internet, disk cache hoặc bộ nhớ container."
            ) from exc

    def warm_up(self) -> None:
        """Thực sự tải model vào RAM ngay khi startup nếu được bật preload."""
        self._ensure_model_loaded()

    def _build_intent_centroids(self) -> None:
        assert self.model is not None and self.tokenizer is not None

        centroids: dict[str, torch.Tensor] = {}
        for intent, examples in INTENT_EXAMPLES.items():
            embeddings = [self.embed_text(text) for text in examples]
            centroid = torch.stack(embeddings).mean(dim=0)
            centroids[intent] = F.normalize(centroid, p=2, dim=0)

        self.intent_centroids = centroids

    def embed_text(self, text: str) -> torch.Tensor:
        """Biến câu tiếng Việt thành vector embedding bằng PhoBERT.

        Mean pooling được dùng để gom thông tin token-level thành sentence embedding.
        Đây là cách nhanh và đủ tốt cho intent classification rule-based.
        """
        self._ensure_model_loaded()
        assert self.model is not None and self.tokenizer is not None

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=128,
            padding=True,
        )

        with torch.no_grad():
            outputs = self.model(**inputs)
            token_embeddings = outputs.last_hidden_state
            attention_mask = inputs["attention_mask"]
            pooled = self._mean_pool(token_embeddings, attention_mask)
            return pooled.squeeze(0)

    @staticmethod
    def _mean_pool(token_embeddings: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        expanded_mask = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        summed = torch.sum(token_embeddings * expanded_mask, dim=1)
        counts = torch.clamp(expanded_mask.sum(dim=1), min=1e-9)
        return summed / counts

    def classify_intent(self, question: str) -> dict[str, Any]:
        self._ensure_model_loaded()
        normalized_question = F.normalize(self.embed_text(question), p=2, dim=0)

        scores: dict[str, float] = {}
        for intent, centroid in self.intent_centroids.items():
            scores[intent] = float(torch.dot(normalized_question, centroid).item())

        best_intent = max(scores, key=scores.get)
        confidence = round(scores[best_intent], 4)
        if confidence < 0.35:
            best_intent = "unknown"

        return {
            "intent": best_intent,
            "confidence": confidence,
            "scores": {key: round(value, 4) for key, value in scores.items()},
            "embedding_dimension": int(normalized_question.shape[0]),
        }

    @staticmethod
    def detect_query_subtype(question: str, intent: str) -> str:
        """Phát hiện sub-type chi tiết hơn cho một intent.

        Với ``query_spending``:
          - ``'specific_category'`` khi hỏi chi bao nhiêu cho danh mục CỤ THỂ
          - ``'category_breakdown'`` khi hỏi danh mục NÀO chi nhiều nhất
          - ``'total_amount'`` khi hỏi tổng chi
        Với các intent khác: trả về ``''``.
        """
        if intent != "query_spending":
            return ""
        # Ưu tiên specific_category trước (vì nó có tên danh mục rõ ràng)
        if _SPECIFIC_CATEGORY_PATTERN.search(question):
            return "specific_category"
        if _CATEGORY_BREAKDOWN_PATTERN.search(question):
            return "category_breakdown"
        return "total_amount"

    @staticmethod
    def _extract_category_from_question(question: str) -> str | None:
        """Trích xuất tên danh mục từ câu hỏi dạng 'chi bao nhiêu cho X'."""
        m = _SPECIFIC_CATEGORY_PATTERN.search(question)
        if m:
            return m.group(1).strip().rstrip('?,!.')
        return None

    def build_query_plan(self, intent: str, question: str, context: dict[str, Any]) -> dict[str, Any]:
        sub_type = self.detect_query_subtype(question, intent)
        if intent == "query_spending":
            if sub_type == "specific_category":
                return {
                    "target_service": "analytics-service",
                    "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                    "action": "specific_category_lookup",
                    "needed_fields": ["summary.totalExpense", "topExpenses"],
                    "sub_type": sub_type,
                    "notes": "Người dùng hỏi chi bao nhiêu cho danh mục cụ thể — cần topExpenses[] để tìm khớp.",
                }
            if sub_type == "category_breakdown":
                return {
                    "target_service": "analytics-service",
                    "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                    "action": "category_breakdown",
                    "needed_fields": ["summary.totalExpense", "topExpenses"],
                    "sub_type": sub_type,
                    "notes": "Người dùng hỏi danh mục chi tiêu cao nhất — cần topExpenses[] để trả lời đúng.",
                }
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "aggregate_total_expense",
                "needed_fields": ["summary.totalExpense"],
                "sub_type": sub_type,
                "notes": "Câu hỏi tổng chi — chỉ cần totalExpense.",
            }

        if intent == "query_income":
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "aggregate_total_income",
                "needed_fields": ["summary.totalIncome", "trend"],
                "notes": "Phù hợp cho dashboard hoặc chatbot popover.",
            }

        if intent == "query_savings":
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "compute_net_savings",
                "needed_fields": ["summary.totalIncome", "summary.totalExpense"],
                "notes": "Cần cả thu và chi để tính số tiền tiết kiệm được.",
            }

        if intent == "market_query":
            return {
                "target_service": "external-market-api",
                "suggested_endpoint": "/api/v1/ai/advisor/chat",
                "action": "fetch_market_data",
                "needed_fields": [],
                "notes": "Dữ liệu thị trường cần gọi external API (vàng/tỷ giá). Nên dùng advisor endpoint.",
            }

        if intent == "financial_advice":
            return {
                "target_service": "analytics-service + optional LLM",
                "suggested_endpoint": "/api/v1/analytics/dashboard",
                "action": "summarize_behavior_then_generate_advice",
                "needed_fields": ["summary", "breakdown", "trend"],
                "notes": "Nên gửi dữ liệu tài chính đã tổng hợp vào LLM để sinh lời khuyên cá nhân hoá.",
            }

        return {
            "target_service": "manual-review",
            "action": "fallback_to_generic_chat",
            "needed_fields": [],
            "notes": "Intent chưa rõ; nên hỏi lại người dùng hoặc dùng LLM tổng quát.",
        }

    def build_rule_based_answer(self, question: str, intent: str, context: dict[str, Any]) -> str:
        safe_context = context if isinstance(context, dict) else {}
        summary = safe_context.get("summary", {})
        financial_context = safe_context.get("financialContext", {})

        # Defensive normalization: avoid malformed client payloads causing `'str' object has no attribute get`.
        if not isinstance(summary, dict):
            summary = {}
        if not isinstance(financial_context, dict):
            financial_context = {}

        # topExpenses có thể nằm trực tiếp trong context hoặc lồng trong financialContext
        top_expenses = (
            safe_context.get("topExpenses")
            or financial_context.get("topExpenses")
            or []
        )
        if not isinstance(top_expenses, list):
            top_expenses = []
        else:
            top_expenses = [item for item in top_expenses if isinstance(item, dict)]

        total_expense = (
            summary.get("totalExpense")
            or summary.get("total_expense")
            or financial_context.get("totalExpense")
            or financial_context.get("total_expense")
            or safe_context.get("totalExpense")
            or safe_context.get("total_expense")
        )
        total_income = (
            summary.get("totalIncome")
            or summary.get("total_income")
            or financial_context.get("totalIncome")
            or financial_context.get("total_income")
            or safe_context.get("totalIncome")
            or safe_context.get("total_income")
        )

        if intent == "market_query":
            return (
                "Câu hỏi này cần dữ liệu thị trường thời gian thực. "
                "Mình đang tra cứu giá vàng/tỷ giá cho bạn, vui lòng chờ một chút nhé."
            )

        if intent == "query_savings":
            if total_income is not None and total_expense is not None:
                net = float(total_income) - float(total_expense)
                if net >= 0:
                    savings_pct = net / float(total_income) * 100 if float(total_income) > 0 else 0
                    return (
                        f"Tháng này bạn tiết kiệm được khoảng {net:,.0f} VND "
                        f"({savings_pct:.0f}% thu nhập) sau khi trừ tất cả chi tiêu."
                    )
                else:
                    over = abs(net)
                    return (
                        f"Tháng này bạn đang bội chi khoảng {over:,.0f} VND "
                        f"(chi nhiều hơn thu nhập). Cần xem lại ngân sách ngay!"
                    )
            return "Mình chưa lấy được đủ dữ liệu thu/chi để tính số tiết kiệm tháng này. Bạn thử hỏi lại sau nhé."

        if intent == "query_spending":
            sub_type = self.detect_query_subtype(question, intent)

            # --- Câu hỏi chi bao nhiêu cho danh mục CỤ THỂ ---
            if sub_type == "specific_category":
                category_q = self._extract_category_from_question(question)
                if category_q and top_expenses:
                    cat_lower = category_q.lower()
                    matched = None
                    for item in top_expenses:
                        if isinstance(item, dict):
                            name = str(item.get("name") or item.get("category") or "").lower()
                            if cat_lower in name or name in cat_lower:
                                matched = item
                                break
                    if matched:
                        m_name = str(matched.get("name") or matched.get("category") or "Không rõ")
                        m_amount = float(matched.get("amount") or 0)
                        pct_str = ""
                        if total_expense and float(total_expense) > 0:
                            pct = m_amount / float(total_expense) * 100
                            pct_str = f", chiếm khoảng {pct:.0f}% tổng chi tiêu tháng này"
                        return f"Tháng này bạn đã chi {m_amount:,.0f} VND cho {m_name}{pct_str}."
                    else:
                        available = ", ".join(
                            str(x.get("name", ""))
                            for x in top_expenses[:4]
                            if isinstance(x, dict) and x.get("name")
                        )
                        return (
                            f"Mình chưa tìm thấy danh mục '{category_q}' trong dữ liệu tháng này. "
                            f"Các danh mục chi tiêu hiện có: {available}."
                        )
                # Không trích xuất được tên hoặc không có topExpenses → fallback sang category_breakdown
                sub_type = "category_breakdown"

            # --- Câu hỏi về danh mục nào chi nhiều nhất ---
            if sub_type == "category_breakdown":
                if top_expenses:
                    top = top_expenses[0]
                    if isinstance(top, dict):
                        top_name = str(top.get("name") or top.get("category") or "Không rõ")
                        top_amount = float(top.get("amount") or 0)
                        # Tính % nếu có tổng
                        pct_str = ""
                        if total_expense and float(total_expense) > 0:
                            pct = top_amount / float(total_expense) * 100
                            pct_str = f", chiếm khoảng {pct:.0f}% tổng chi tiêu"
                        # Danh mục thứ 2 (nếu có)
                        second_str = ""
                        if len(top_expenses) > 1:
                            second = top_expenses[1]
                            if isinstance(second, dict):
                                s_name = str(second.get("name") or second.get("category") or "")
                                s_amount = float(second.get("amount") or 0)
                                if s_name:
                                    second_str = f" Đứng thứ hai là {s_name} với {s_amount:,.0f} VND."
                        return (
                            f"Tháng này bạn chi nhiều nhất cho {top_name} "
                            f"với {top_amount:,.0f} VND{pct_str}.{second_str} "
                            f"Đây là khoản đáng chú ý nhất nếu bạn muốn cắt giảm chi tiêu."
                        )
                # Có topExpenses nhưng không parse được — fallback về tổng
                if total_expense is not None:
                    return (
                        f"Tổng chi tiêu tháng này của bạn là {float(total_expense):,.0f} VND. "
                        f"Hiện chưa có dữ liệu phân loại danh mục chi tiết."
                    )
                return "Mình chưa lấy được dữ liệu danh mục chi tiêu. Bạn thử hỏi lại sau nhé."

            # --- Câu hỏi tổng chi ---
            if total_expense is not None:
                return f"Tổng chi tiêu tháng này của bạn là {float(total_expense):,.0f} VND."
            return (
                "Mình nhận diện đây là câu hỏi về chi tiêu, nhưng hiện chưa có dữ liệu từ analytics-service."
            )

        if intent == "query_income":
            if total_income is not None:
                return f"Tổng thu nhập hiện tại của bạn là {float(total_income):,.0f} VND trong tháng này."
            return (
                "Đây là câu hỏi về thu nhập, nhưng hiện chưa lấy được `summary.totalIncome` từ analytics-service."
            )

        if intent == "financial_advice":
            if total_income is not None and total_expense is not None:
                net_cash_flow = float(total_income) - float(total_expense)
                savings_rate = 0.0 if float(total_income) <= 0 else max(net_cash_flow, 0) / float(total_income) * 100
                top_expense = top_expenses[0] if isinstance(top_expenses, list) and top_expenses else None
                if isinstance(top_expense, dict):
                    category_name = str(top_expense.get("name") or "danh mục lớn nhất")
                    category_amount = float(top_expense.get("amount") or 0)
                    return (
                        f"Tháng này bạn thu {float(total_income):,.0f} VND và chi {float(total_expense):,.0f} VND, "
                        f"còn lại khoảng {net_cash_flow:,.0f} VND. Khoản chi lớn nhất hiện là {category_name} "
                        f"({category_amount:,.0f} VND), nên bạn hãy đặt trần chi tiêu riêng cho nhóm này để cải thiện tỷ lệ tiết kiệm lên trên {savings_rate:.0f}%."
                    )
                return (
                    f"Tháng này bạn thu {float(total_income):,.0f} VND và chi {float(total_expense):,.0f} VND, "
                    f"còn lại khoảng {net_cash_flow:,.0f} VND. Bạn nên đặt ngân sách tuần cố định và giữ ít nhất 20% thu nhập cho tiết kiệm trước khi chi tiêu linh hoạt."
                )

            return (
                "Tôi có thể đưa lời khuyên tốt hơn nếu backend gửi thêm tổng thu, tổng chi và nhóm chi tiêu lớn nhất từ analytics-service."
            )

        return (
            "Mình chưa chắc ý định câu hỏi. Bạn có thể hỏi rõ hơn về chi tiêu, thu nhập hoặc lời khuyên tài chính."
        )

    async def answer_question(
        self,
        question: str,
        context: dict[str, Any] | None = None,
        use_llm: bool = False,
        llm_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not question.strip():
            raise ValueError("Question không được để trống")

        safe_context = context or {}
        prediction = self.classify_intent(question)
        intent = prediction["intent"]
        sub_type = self.detect_query_subtype(question, intent)
        query_plan = self.build_query_plan(intent=intent, question=question, context=safe_context)
        answer = self.build_rule_based_answer(question=question, intent=intent, context=safe_context)
        llm_used = False
        llm_meta: dict[str, Any] | None = None
        auto_use_llm = use_llm or (
            os.getenv('AI_AUTO_USE_GEMINI', 'false').lower() == 'true'
            and intent in {'financial_advice', 'unknown'}
        )

        # Đính kèm sub_type vào context để Gemini biết người dùng muốn gì
        llm_context = {**safe_context, "_sub_type": sub_type, "_intent": intent}

        if auto_use_llm:
            llm_result = await self._call_gemini(
                question=question,
                intent=intent,
                context=llm_context,
                llm_config=llm_config or {},
            )
            if llm_result and isinstance(llm_result.get("answer"), str):
                answer = str(llm_result["answer"])
                llm_used = True
                llm_meta = {
                    "model": llm_result.get("model"),
                    "usage": llm_result.get("usage") or {},
                }

        return {
            "question": question,
            "intent": intent,
            "sub_type": sub_type,
            "confidence": prediction["confidence"],
            "scores": prediction["scores"],
            "answer": answer,
            "llm_used": llm_used,
            "query_plan": query_plan,
            "meta": {
                "embedding_dimension": prediction["embedding_dimension"],
                "model": PHOBERT_MODEL_NAME,
            },
            "llm": llm_meta,
        }

    async def _call_gemini(
        self,
        question: str,
        intent: str,
        context: dict[str, Any],
        llm_config: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Dùng Gemini để diễn đạt câu trả lời tự nhiên hơn khi đã cấu hình API key trong `.env`."""
        fallback_answer = self.build_rule_based_answer(question=question, intent=intent, context=context)
        return await get_gemini_service().generate_financial_answer(
            question=question,
            intent=intent,
            context=context,
            fallback_answer=fallback_answer,
            model_override=str(llm_config.get("model") or "").strip() or None,
            api_key_override=str(llm_config.get("gemini_api_key") or "").strip() or None,
        )


@lru_cache(maxsize=1)
def get_nlp_service() -> NLPService:
    return NLPService()
