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

    def _url(self, *, api_key: str, model: str) -> str:
        return (
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
            f'?key={api_key}'
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

    @staticmethod
    def _extract_usage(data: dict[str, Any]) -> dict[str, int]:
        usage = data.get('usageMetadata', {}) if isinstance(data, dict) else {}
        prompt_tokens = int(usage.get('promptTokenCount', 0) or 0)
        completion_tokens = int(usage.get('candidatesTokenCount', 0) or 0)
        total_tokens = int(usage.get('totalTokenCount', prompt_tokens + completion_tokens) or 0)
        return {
            'prompt_tokens': max(0, prompt_tokens),
            'completion_tokens': max(0, completion_tokens),
            'total_tokens': max(0, total_tokens),
        }

    @staticmethod
    def _extract_grounding_sources(data: dict[str, Any]) -> list[dict[str, str]]:
        candidates = data.get('candidates', []) if isinstance(data, dict) else []
        if not isinstance(candidates, list) or not candidates:
            return []

        grounding = candidates[0].get('groundingMetadata', {}) if isinstance(candidates[0], dict) else {}
        chunks = grounding.get('groundingChunks', []) if isinstance(grounding, dict) else []
        if not isinstance(chunks, list):
            return []

        sources: list[dict[str, str]] = []
        for chunk in chunks:
            if not isinstance(chunk, dict):
                continue
            web = chunk.get('web', {}) if isinstance(chunk.get('web'), dict) else {}
            uri = str(web.get('uri') or '').strip()
            title = str(web.get('title') or '').strip()
            if uri or title:
                sources.append({'title': title, 'url': uri})
        return sources[:8]

    async def generate_financial_answer(
        self,
        *,
        question: str,
        intent: str,
        context: dict[str, Any],
        fallback_answer: str,
        model_override: str | None = None,
        api_key_override: str | None = None,
        use_google_search: bool = False,
    ) -> dict[str, Any] | None:
        resolved_api_key = (api_key_override or self.api_key or '').strip()
        resolved_model = (model_override or self.model or GEMINI_MODEL).strip()

        if not resolved_api_key:
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
        if use_google_search:
            payload['tools'] = [{'googleSearch': {}}]

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=4.0)) as client:
                response = await client.post(self._url(api_key=resolved_api_key, model=resolved_model), json=payload)
                response.raise_for_status()
                data = response.json()
                generated = self._extract_text(data)
                if not generated or len(generated.strip()) < 12:
                    return None
                return {
                    'answer': generated.strip(),
                    'model': resolved_model,
                    'usage': self._extract_usage(data),
                    'grounding_sources': self._extract_grounding_sources(data),
                }
        except Exception:
            return None

    async def generate_advisor_answer(
        self,
        *,
        question: str,
        system_prompt: str,
        tool_context: dict[str, Any],
        model_override: str | None = None,
        api_key_override: str | None = None,
        use_google_search: bool = False,
    ) -> dict[str, Any] | None:
        resolved_api_key = (api_key_override or self.api_key or '').strip()
        resolved_model = (model_override or self.model or GEMINI_MODEL).strip()
        if not resolved_api_key:
            return None

        prompt = (
            f'{system_prompt}\n\n'
            f'Cau hoi nguoi dung: {question}\n'
            f'Ngu canh cong cu: {json.dumps(tool_context, ensure_ascii=False)}\n'
            'Tra loi ngan gon, ro rang, uu tien tieng Viet tu nhien.'
        )

        payload: dict[str, Any] = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.2,
                'topP': 0.8,
                'maxOutputTokens': 512,
                'thinkingConfig': {'thinkingBudget': 0},
            },
        }
        if use_google_search:
            payload['tools'] = [{'googleSearch': {}}]

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(14.0, connect=4.0)) as client:
                response = await client.post(self._url(api_key=resolved_api_key, model=resolved_model), json=payload)
                response.raise_for_status()
                data = response.json()
                generated = self._extract_text(data)
                if not generated or len(generated.strip()) < 8:
                    return None
                return {
                    'answer': generated.strip(),
                    'model': resolved_model,
                    'usage': self._extract_usage(data),
                    'grounding_sources': self._extract_grounding_sources(data),
                }
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
            response = httpx.post(self._url(api_key=self.api_key, model=self.model), json=payload, timeout=20.0)
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
