from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

import httpx

GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')


class GeminiService:
    """Gemini helper dùng để tăng chất lượng câu trả lời và hậu xử lý OCR khi có API key."""

    def __init__(self) -> None:
        self.api_key = os.getenv('GEMINI_API_KEY', '').strip()
        self.model = os.getenv('GEMINI_MODEL', GEMINI_MODEL)

    def is_enabled(self) -> bool:
        return bool(self.api_key)

    def _url(self) -> str:
        return (
            f'https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent'
            f'?key={self.api_key}'
        )

    @staticmethod
    def _extract_text(data: dict[str, Any]) -> str | None:
        try:
            parts = data['candidates'][0]['content']['parts']
            texts = [part.get('text', '') for part in parts if isinstance(part, dict) and part.get('text')]
            joined = ''.join(texts).strip()
            return joined or None
        except Exception:
            return None

    async def generate_financial_answer(
        self,
        *,
        question: str,
        intent: str,
        context: dict[str, Any],
        fallback_answer: str,
    ) -> str | None:
        if not self.is_enabled():
            return None

        prompt = (
            'Bạn là Senior AI Financial Assistant cho ứng dụng quản lý tài chính cá nhân. '
            'Trả lời bằng tiếng Việt tự nhiên, súc tích và hữu ích trong 2-4 câu ngắn. '
            'Ưu tiên format phù hợp cho dashboard insight: câu đầu là nhận định chính, câu sau nêu nguyên nhân hoặc hành động cụ thể. '
            'Tuyệt đối không bịa số liệu: chỉ dùng số từ financialContext/context; nếu thiếu thì nói rõ là chưa có dữ liệu. '
            'Nếu đang đưa lời khuyên, hãy nêu ngắn gọn: tình hình hiện tại, nguyên nhân lớn nhất và 1-2 hành động cụ thể. '
            f'Intent đã nhận diện: {intent}.\n'
            f'Câu hỏi người dùng: {question}.\n'
            f'Context dữ liệu đáng tin cậy từ backend: {json.dumps(context, ensure_ascii=False)}.\n'
            f'Nếu context không đủ, dùng câu fallback sau làm nền: {fallback_answer}'
        )

        payload = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.2,
                'topP': 0.8,
                'maxOutputTokens': 384,
                'thinkingConfig': {
                    'thinkingBudget': 0,
                },
            },
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=4.0)) as client:
                response = await client.post(self._url(), json=payload)
                response.raise_for_status()
                data = response.json()
                generated = self._extract_text(data)
                if not generated or len(generated.strip()) < 12:
                    return None
                return generated.strip()
        except Exception:
            return None

@lru_cache(maxsize=1)
def get_gemini_service() -> GeminiService:
    return GeminiService()
