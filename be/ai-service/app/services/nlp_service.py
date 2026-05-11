from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Any

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer

from app.services.gemini_service import get_gemini_service

# pattern nay hay bi loi voi tieng viet co dau, can test them
_CAT_BREAKDOWN_PAT = re.compile(
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

# fix bug #123: regex loi khi co tieng viet
_SPECIFIC_CAT_PAT = re.compile(
    r'(?:chi|tiêu|tốn)\s+(?:bao\s+nhiêu|mấy)\s*(?:tiền\s*)?(?:cho|vào|vào\s+khoản|vào\s+mục)\s+(.+?)(?:\?|$)',
    re.IGNORECASE,
)

_MARKET_PAT = re.compile(
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

# TODO: toi uu lai doan nay sau, dang hoi cham khi container boot
torch.set_num_threads(max(1, int(os.getenv("TORCH_NUM_THREADS", "1"))))


class NLPService:
    def __init__(self) -> None:
        self.tokenizer = None
        self.model = None
        self.intent_centroids: dict[str, torch.Tensor] = {}

    def _load_model(self) -> None:
        if self.model is not None and self.tokenizer is not None:
            return
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(PHOBERT_MODEL_NAME)
            self.model = AutoModel.from_pretrained(PHOBERT_MODEL_NAME)
            self.model.eval()
            self._build_centroids()
        except Exception as exc:
            raise RuntimeError(
                "Không thể tải PhoBERT. Hãy kiểm tra internet, disk cache hoặc bộ nhớ container."
            ) from exc

    def _ensure_model_loaded(self) -> None:
        self._load_model()

    def warm_up(self) -> None:
        self._load_model()

    def _build_centroids(self) -> None:
        assert self.model is not None and self.tokenizer is not None
        centroids: dict[str, torch.Tensor] = {}
        for intent, examples in INTENT_EXAMPLES.items():
            vecs = [self.embed(t) for t in examples]
            c = torch.stack(vecs).mean(dim=0)
            centroids[intent] = F.normalize(c, p=2, dim=0)
        self.intent_centroids = centroids

    # hacky workaround, dung xoa
    def _build_intent_centroids(self) -> None:
        self._build_centroids()

    def embed(self, text: str) -> torch.Tensor:
        self._load_model()
        assert self.model is not None and self.tokenizer is not None
        inputs = self.tokenizer(
            text, return_tensors="pt", truncation=True, max_length=128, padding=True,
        )
        with torch.no_grad():
            out = self.model(**inputs)
            tok_emb = out.last_hidden_state
            mask = inputs["attention_mask"]
            pooled = self._pool(tok_emb, mask)
            return pooled.squeeze(0)

    def embed_text(self, text: str) -> torch.Tensor:
        return self.embed(text)

    @staticmethod
    def _pool(tok_emb: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        exp = mask.unsqueeze(-1).expand(tok_emb.size()).float()
        s = torch.sum(tok_emb * exp, dim=1)
        c = torch.clamp(exp.sum(dim=1), min=1e-9)
        return s / c

    @staticmethod
    def _mean_pool(token_embeddings: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        return NLPService._pool(token_embeddings, attention_mask)

    def classify_intent(self, question: str) -> dict[str, Any]:
        self._load_model()
        q_vec = F.normalize(self.embed(question), p=2, dim=0)
        scores: dict[str, float] = {}
        for intent, centroid in self.intent_centroids.items():
            scores[intent] = float(torch.dot(q_vec, centroid).item())
        best = max(scores, key=scores.get)
        conf = round(scores[best], 4)
        if conf < 0.35:
            best = "unknown"
        return {
            "intent": best,
            "confidence": conf,
            "scores": {k: round(v, 4) for k, v in scores.items()},
            "embedding_dimension": int(q_vec.shape[0]),
        }

    @staticmethod
    def detect_query_subtype(question: str, intent: str) -> str:
        if intent != "query_spending":
            return ""
        if _SPECIFIC_CAT_PAT.search(question):
            return "specific_category"
        if _CAT_BREAKDOWN_PAT.search(question):
            return "category_breakdown"
        return "total_amount"

    @staticmethod
    def _extract_category_from_question(question: str) -> str | None:
        m = _SPECIFIC_CAT_PAT.search(question)
        if m:
            return m.group(1).strip().rstrip("?,!.")
        return None

    def build_query_plan(self, intent: str, question: str, context: dict[str, Any]) -> dict[str, Any]:
        sub = self.detect_query_subtype(question, intent)
        # TODO: refactor cai nay thanh dict lookup cho gon
        if intent == "query_spending":
            if sub == "specific_category":
                return {
                    "target_service": "analytics-service",
                    "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                    "action": "specific_category_lookup",
                    "needed_fields": ["summary.totalExpense", "topExpenses"],
                    "sub_type": sub,
                    "notes": "Nguoi dung hoi chi bao nhieu cho danh muc cu the",
                }
            if sub == "category_breakdown":
                return {
                    "target_service": "analytics-service",
                    "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                    "action": "category_breakdown",
                    "needed_fields": ["summary.totalExpense", "topExpenses"],
                    "sub_type": sub,
                    "notes": "Nguoi dung hoi danh muc chi nhieu nhat",
                }
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "aggregate_total_expense",
                "needed_fields": ["summary.totalExpense"],
                "sub_type": sub,
                "notes": "Cau hoi tong chi",
            }
        if intent == "query_income":
            return {
                "target_service": "analytics-service",
                "suggested_endpoint": "/api/v1/analytics/dashboard?month=current",
                "action": "aggregate_total_income",
                "needed_fields": ["summary.totalIncome", "trend"],
                "notes": "dashboard hoac chatbot popover",
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
                "notes": "can goi external API (vang/ty gia)",
            }
        if intent == "financial_advice":
            return {
                "target_service": "analytics-service + optional LLM",
                "suggested_endpoint": "/api/v1/analytics/dashboard",
                "action": "summarize_behavior_then_generate_advice",
                "needed_fields": ["summary", "breakdown", "trend"],
                "notes": "Nen gui data tai chinh vao LLM de sinh loi khuyen",
            }
        return {
            "target_service": "manual-review",
            "action": "fallback_to_generic_chat",
            "needed_fields": [],
            "notes": "Intent chua ro",
        }

    def build_rule_based_answer(self, question: str, intent: str, context: dict[str, Any]) -> str:
        safe_ctx = context if isinstance(context, dict) else {}
        summary = safe_ctx.get("summary", {})
        fin_ctx = safe_ctx.get("financialContext", {})
        if not isinstance(summary, dict):
            summary = {}
        if not isinstance(fin_ctx, dict):
            fin_ctx = {}
        top_expenses = (
            safe_ctx.get("topExpenses") or fin_ctx.get("topExpenses") or []
        )
        if not isinstance(top_expenses, list):
            top_expenses = []
        else:
            top_expenses = [x for x in top_expenses if isinstance(x, dict)]
        total_expense = (
            summary.get("totalExpense") or summary.get("total_expense")
            or fin_ctx.get("totalExpense") or fin_ctx.get("total_expense")
            or safe_ctx.get("totalExpense") or safe_ctx.get("total_expense")
        )
        total_income = (
            summary.get("totalIncome") or summary.get("total_income")
            or fin_ctx.get("totalIncome") or fin_ctx.get("total_income")
            or safe_ctx.get("totalIncome") or safe_ctx.get("total_income")
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
                    pct = net / float(total_income) * 100 if float(total_income) > 0 else 0
                    return (
                        f"Tháng này bạn tiết kiệm được khoảng {net:,.0f} VND "
                        f"({pct:.0f}% thu nhập) sau khi trừ tất cả chi tiêu."
                    )
                else:
                    over = abs(net)
                    return (
                        f"Tháng này bạn đang bội chi khoảng {over:,.0f} VND "
                        f"(chi nhiều hơn thu nhập). Cần xem lại ngân sách ngay!"
                    )
            return "Mình chưa lấy được đủ dữ liệu thu/chi để tính số tiết kiệm tháng này. Bạn thử hỏi lại sau nhé."
        if intent == "query_spending":
            sub = self.detect_query_subtype(question, intent)
            if sub == "specific_category":
                cat_q = self._extract_category_from_question(question)
                if cat_q and top_expenses:
                    cat_lower = cat_q.lower()
                    matched = None
                    for item in top_expenses:
                        if isinstance(item, dict):
                            name = str(item.get("name") or item.get("category") or "").lower()
                            if cat_lower in name or name in cat_lower:
                                matched = item
                                break
                    if matched:
                        m_name = str(matched.get("name") or matched.get("category") or "Không rõ")
                        m_amt = float(matched.get("amount") or 0)
                        pct_str = ""
                        if total_expense and float(total_expense) > 0:
                            pct = m_amt / float(total_expense) * 100
                            pct_str = f", chiếm khoảng {pct:.0f}% tổng chi tiêu tháng này"
                        return f"Tháng này bạn đã chi {m_amt:,.0f} VND cho {m_name}{pct_str}."
                    else:
                        avail = ", ".join(
                            str(x.get("name", "")) for x in top_expenses[:4]
                            if isinstance(x, dict) and x.get("name")
                        )
                        return (
                            f"Mình chưa tìm thấy danh mục '{cat_q}' trong dữ liệu tháng này. "
                            f"Các danh mục chi tiêu hiện có: {avail}."
                        )
                sub = "category_breakdown"
            if sub == "category_breakdown":
                if top_expenses:
                    top = top_expenses[0]
                    if isinstance(top, dict):
                        top_name = str(top.get("name") or top.get("category") or "Không rõ")
                        top_amt = float(top.get("amount") or 0)
                        pct_str = ""
                        if total_expense and float(total_expense) > 0:
                            pct = top_amt / float(total_expense) * 100
                            pct_str = f", chiếm khoảng {pct:.0f}% tổng chi tiêu"
                        second_str = ""
                        if len(top_expenses) > 1:
                            second = top_expenses[1]
                            if isinstance(second, dict):
                                s_name = str(second.get("name") or second.get("category") or "")
                                s_amt = float(second.get("amount") or 0)
                                if s_name:
                                    second_str = f" Đứng thứ hai là {s_name} với {s_amt:,.0f} VND."
                        return (
                            f"Tháng này bạn chi nhiều nhất cho {top_name} "
                            f"với {top_amt:,.0f} VND{pct_str}.{second_str} "
                            f"Đây là khoản đáng chú ý nhất nếu bạn muốn cắt giảm chi tiêu."
                        )
                if total_expense is not None:
                    return (
                        f"Tổng chi tiêu tháng này của bạn là {float(total_expense):,.0f} VND. "
                        f"Hiện chưa có dữ liệu phân loại danh mục chi tiết."
                    )
                return "Mình chưa lấy được dữ liệu danh mục chi tiêu. Bạn thử hỏi lại sau nhé."
            if total_expense is not None:
                return f"Tổng chi tiêu tháng này của bạn là {float(total_expense):,.0f} VND."
            return "Mình nhận diện đây là câu hỏi về chi tiêu, nhưng hiện chưa có dữ liệu từ analytics-service."
        if intent == "query_income":
            if total_income is not None:
                return f"Tổng thu nhập hiện tại của bạn là {float(total_income):,.0f} VND trong tháng này."
            return "Đây là câu hỏi về thu nhập, nhưng hiện chưa lấy được summary.totalIncome từ analytics-service."
        if intent == "financial_advice":
            if total_income is not None and total_expense is not None:
                net = float(total_income) - float(total_expense)
                rate = 0.0 if float(total_income) <= 0 else max(net, 0) / float(total_income) * 100
                top = top_expenses[0] if isinstance(top_expenses, list) and top_expenses else None
                if isinstance(top, dict):
                    cat_name = str(top.get("name") or "danh mục lớn nhất")
                    cat_amt = float(top.get("amount") or 0)
                    return (
                        f"Tháng này bạn thu {float(total_income):,.0f} VND và chi {float(total_expense):,.0f} VND, "
                        f"còn lại khoảng {net:,.0f} VND. Khoản chi lớn nhất hiện là {cat_name} "
                        f"({cat_amt:,.0f} VND), nên bạn hãy đặt trần chi tiêu riêng cho nhóm này để cải thiện tỷ lệ tiết kiệm lên trên {rate:.0f}%."
                    )
                return (
                    f"Tháng này bạn thu {float(total_income):,.0f} VND và chi {float(total_expense):,.0f} VND, "
                    f"còn lại khoảng {net:,.0f} VND. Bạn nên đặt ngân sách tuần cố định và giữ ít nhất 20% thu nhập cho tiết kiệm trước khi chi tiêu linh hoạt."
                )
            return "Tôi có thể đưa lời khuyên tốt hơn nếu backend gửi thêm tổng thu, tổng chi và nhóm chi tiêu lớn nhất từ analytics-service."
        return "Mình chưa chắc ý định câu hỏi. Bạn có thể hỏi rõ hơn về chi tiêu, thu nhập hoặc lời khuyên tài chính."

    async def answer_question(
        self,
        question: str,
        context: dict[str, Any] | None = None,
        use_llm: bool = False,
        llm_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not question.strip():
            raise ValueError("Question không được để trống")
        ctx = context or {}
        pred = self.classify_intent(question)
        intent = pred["intent"]
        sub = self.detect_query_subtype(question, intent)
        qplan = self.build_query_plan(intent=intent, question=question, context=ctx)
        answer = self.build_rule_based_answer(question=question, intent=intent, context=ctx)
        llm_used = False
        llm_meta: dict[str, Any] | None = None
        auto_llm = use_llm or (
            os.getenv("AI_AUTO_USE_GEMINI", "false").lower() == "true"
            and intent in {"financial_advice", "unknown"}
        )
        llm_ctx = {**ctx, "_sub_type": sub, "_intent": intent}
        if auto_llm:
            llm_res = await self._call_gemini(
                question=question, intent=intent,
                context=llm_ctx, llm_config=llm_config or {},
            )
            if llm_res and isinstance(llm_res.get("answer"), str):
                answer = str(llm_res["answer"])
                llm_used = True
                llm_meta = {"model": llm_res.get("model"), "usage": llm_res.get("usage") or {}}
        return {
            "question": question,
            "intent": intent,
            "sub_type": sub,
            "confidence": pred["confidence"],
            "scores": pred["scores"],
            "answer": answer,
            "llm_used": llm_used,
            "query_plan": qplan,
            "meta": {"embedding_dimension": pred["embedding_dimension"], "model": PHOBERT_MODEL_NAME},
            "llm": llm_meta,
        }

    async def _call_gemini(
        self,
        question: str,
        intent: str,
        context: dict[str, Any],
        llm_config: dict[str, Any],
    ) -> dict[str, Any] | None:
        fallback = self.build_rule_based_answer(question=question, intent=intent, context=context)
        return await get_gemini_service().generate_financial_answer(
            question=question,
            intent=intent,
            context=context,
            fallback_answer=fallback,
            model_override=str(llm_config.get("model") or "").strip() or None,
            api_key_override=str(llm_config.get("gemini_api_key") or "").strip() or None,
        )


@lru_cache(maxsize=1)
def get_nlp_service() -> NLPService:
    return NLPService()