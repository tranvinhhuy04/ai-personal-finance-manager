from __future__ import annotations

import json
import os
import re
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
            return data['candidates'][0]['content']['parts'][0]['text']
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
            'Trả lời bằng tiếng Việt, ngắn gọn, thực tế, ưu tiên số liệu trong context. '
            f'Intent đã nhận diện: {intent}.\n'
            f'Câu hỏi người dùng: {question}.\n'
            f'Context dữ liệu: {json.dumps(context, ensure_ascii=False)}.\n'
            f'Nếu context không đủ, dùng câu fallback sau làm nền: {fallback_answer}'
        )

        payload = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.3,
                'topP': 0.9,
                'maxOutputTokens': 300,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post(self._url(), json=payload)
                response.raise_for_status()
                data = response.json()
                return self._extract_text(data)
        except Exception:
            return None

    def refine_ocr_fields(self, *, raw_text: str, extracted_data: dict[str, Any]) -> dict[str, Any]:
        """Dùng Gemini để tinh chỉnh field OCR từ raw text khi bật cờ cấu hình."""
        if not self.is_enabled() or not raw_text.strip():
            return extracted_data

        prompt = (
            'Trích xuất thông tin hóa đơn tiếng Việt từ raw text dưới đây. '
            'Chỉ trả về JSON hợp lệ với các key: '
            'merchant_name, total_amount, date, merchantName, totalAmount, transactionDate, description.\n'
            f'Raw text:\n{raw_text}\n'
            f'Kết quả heuristic hiện tại: {json.dumps(extracted_data, ensure_ascii=False)}'
        )

        payload = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.1,
                'responseMimeType': 'application/json',
                'maxOutputTokens': 300,
            },
        }

        try:
            response = httpx.post(self._url(), json=payload, timeout=20.0)
            response.raise_for_status()
            data = response.json()
            text = self._extract_text(data)
            if not text:
                return extracted_data

            cleaned = re.sub(r'^```json\s*|\s*```$', '', text.strip(), flags=re.MULTILINE)
            refined = json.loads(cleaned)
            if not isinstance(refined, dict):
                return extracted_data
            return {**extracted_data, **refined}
        except Exception:
            return extracted_data


@lru_cache(maxsize=1)
def get_gemini_service() -> GeminiService:
    return GeminiService()
