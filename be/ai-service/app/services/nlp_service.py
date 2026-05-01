from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer

from app.services.gemini_service import get_gemini_service

PHOBERT_MODEL_NAME = os.getenv("PHOBERT_MODEL_NAME", "vinai/phobert-base-v2")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
INTENT_EXAMPLES = {
    "query_spending": [
        "Tổng chi tiêu tháng này là bao nhiêu?",
        "Tôi đã tiêu bao nhiêu tiền trong tháng này?",
        "Chi tiêu cho ăn uống tháng này thế nào?",
    ],
    "query_income": [
        "Thu nhập tháng này là bao nhiêu?",
        "Tôi nhận được bao nhiêu tiền trong tháng này?",
        "Nguồn thu nhập gần đây của tôi là gì?",
    ],
    "financial_advice": [
        "Làm sao để tiết kiệm 20% lương mỗi tháng?",
        "Hãy cho tôi lời khuyên tài chính cá nhân",
        "Tôi nên tối ưu ngân sách như thế nào?",
    ],
}

# Giới hạn thread của PyTorch để giảm CPU/RAM peak trong Docker.
torch.set_num_threads(max(1, int(os.getenv("TORCH_NUM_THREADS", "1"))))


class NLPService:
    """Service NLP dùng PhoBERT để sinh embedding và đo độ giống ngữ nghĩa.

    Đây là skeleton production-friendly:
    - PhoBERT tạo embedding câu hỏi.
    - So sánh cosine similarity với bộ intent mẫu.
    - Sau đó route sang analytics-service / wallet-service hoặc gọi LLM.
    """

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

    def build_query_plan(self, intent: str, question: str, context: dict[str, Any]) -> dict[str, Any]:
        if intent == "query_spending":
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "aggregate_total_expense",
                "needed_fields": ["summary.totalExpense", "breakdown"],
                "notes": "Sau khi lấy dữ liệu, có thể cho Gemini diễn đạt lại thành câu trả lời tự nhiên.",
            }

        if intent == "query_income":
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "aggregate_total_income",
                "needed_fields": ["summary.totalIncome", "trend"],
                "notes": "Phù hợp cho dashboard hoặc chatbot popover.",
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
        summary = context.get("summary", {}) if isinstance(context, dict) else {}
        financial_context = context.get("financialContext", {}) if isinstance(context, dict) else {}
        top_expenses = context.get("topExpenses", []) if isinstance(context, dict) else []

        total_expense = (
            summary.get("totalExpense")
            or summary.get("total_expense")
            or financial_context.get("totalExpense")
            or financial_context.get("total_expense")
        )
        total_income = (
            summary.get("totalIncome")
            or summary.get("total_income")
            or financial_context.get("totalIncome")
            or financial_context.get("total_income")
        )

        if intent == "query_spending":
            if total_expense is not None:
                return f"Tổng chi tiêu hiện tại của bạn là {float(total_expense):,.0f} VND trong tháng này."
            return (
                "Mình nhận diện đây là câu hỏi về chi tiêu, nhưng hiện chưa có dữ liệu tổng hợp từ analytics-service để trả lời chính xác."
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
        query_plan = self.build_query_plan(intent=intent, question=question, context=safe_context)
        answer = self.build_rule_based_answer(question=question, intent=intent, context=safe_context)
        llm_used = False
        llm_meta: dict[str, Any] | None = None
        auto_use_llm = use_llm or (
            os.getenv('AI_AUTO_USE_GEMINI', 'false').lower() == 'true'
            and intent in {'financial_advice', 'unknown'}
        )

        if auto_use_llm:
            llm_result = await self._call_gemini(
                question=question,
                intent=intent,
                context=safe_context,
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
