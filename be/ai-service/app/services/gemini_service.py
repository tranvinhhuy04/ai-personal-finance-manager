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

    def _effective_credentials(
        self,
        *,
        model_override: str | None = None,
        api_key_override: str | None = None,
    ) -> tuple[str, str] | None:
        model = (model_override or self.model or '').strip()
        api_key = (api_key_override or self.api_key or '').strip()
        if not model or not api_key:
            return None
        return model, api_key

    def _url(self) -> str:
        return (
            f'https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent'
            f'?key={self.api_key}'
        )

    @staticmethod
    def _build_url(model: str, api_key: str) -> str:
        return f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'

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
        usage = data.get('usageMetadata') if isinstance(data, dict) else {}
        if not isinstance(usage, dict):
            usage = {}

        prompt_tokens = int(usage.get('promptTokenCount') or 0)
        completion_tokens = int(usage.get('candidatesTokenCount') or 0)
        total_tokens = int(usage.get('totalTokenCount') or (prompt_tokens + completion_tokens))

        return {
            'prompt_tokens': max(prompt_tokens, 0),
            'completion_tokens': max(completion_tokens, 0),
            'total_tokens': max(total_tokens, 0),
        }

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

    async def extract_transactions_from_text(
        self,
        *,
        input_text: str,
        model_override: str | None = None,
        api_key_override: str | None = None,
    ) -> dict[str, Any] | None:
        credentials = self._effective_credentials(model_override=model_override, api_key_override=api_key_override)
        if not credentials:
            return None
        model, api_key = credentials

        system_prompt = (
            'Bạn là trợ lý tài chính thông minh. Hãy đọc đoạn văn bản hoặc hội thoại sau. '
            'Nhiệm vụ của bạn là trích xuất các giao dịch tài chính thu/chi CỦA NGƯỜI DÙNG (người đang hỏi bạn). '
            'Nếu là đoạn chat nhóm chia tiền, hãy đọc kỹ ngữ cảnh, cộng dồn các khoản mà người dùng phải trả/được nhận. '\
            'Chỉ trả về MỘT MẢNG JSON theo đúng schema sau, không kèm giải thích:\n'
            '[\n'
            '  {\n'
            '    "title": "Tên giao dịch (ngắn gọn)",\n'
            '    "amount": Số tiền (dạng số, vd: 450000),\n'
            '    "type": "expense" hoặc "income",\n'
            '    "category": "Tên danh mục dự đoán (VD: Ăn uống, Di chuyển, Mua sắm...)"\n'
            '  }\n'
            ']'
        )

        payload = {
            'contents': [{
                'parts': [{
                    'text': f'{system_prompt}\n\nVăn bản đầu vào:\n{input_text.strip()}'
                }]
            }],
            'generationConfig': {
                'temperature': 0.0,
                'topP': 0.8,
                'maxOutputTokens': 1024,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
                response = await client.post(self._build_url(model, api_key), json=payload)
                response.raise_for_status()
                data = response.json()
                generated = self._extract_text(data)
                if not generated:
                    raise RuntimeError('Gemini response does not contain generated text')
                return {
                    'text': generated.strip(),
                    'model': model,
                    'usage': self._extract_usage(data),
                }
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500] if exc.response is not None else str(exc)
            raise RuntimeError(f'Gemini API HTTP error: {detail}') from exc
        except httpx.RequestError as exc:
            raise RuntimeError(f'Unable to reach Gemini API: {exc}') from exc
        except Exception:
            raise

    async def provider_status(
        self,
        *,
        model_override: str | None = None,
        api_key_override: str | None = None,
        probe: bool = True,
    ) -> dict[str, Any]:
        credentials = self._effective_credentials(model_override=model_override, api_key_override=api_key_override)
        model = (model_override or self.model or '').strip() or GEMINI_MODEL
        key_present = bool((api_key_override or self.api_key or '').strip())

        if not credentials:
            return {
                'enabled': False,
                'key_present': key_present,
                'model': model,
                'status': 'disabled',
                'message': 'Gemini API key is missing',
                'http_status': None,
            }

        if not probe:
            return {
                'enabled': True,
                'key_present': True,
                'model': model,
                'status': 'configured',
                'message': 'Gemini credentials configured',
                'http_status': None,
            }

        resolved_model, api_key = credentials
        payload = {
            'contents': [{
                'parts': [{
                    'text': 'Trả về chính xác từ "OK".'
                }]
            }],
            'generationConfig': {
                'temperature': 0.0,
                'maxOutputTokens': 8,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=4.0)) as client:
                response = await client.post(self._build_url(resolved_model, api_key), json=payload)
                response.raise_for_status()
                return {
                    'enabled': True,
                    'key_present': True,
                    'model': resolved_model,
                    'status': 'ok',
                    'message': 'Gemini provider is reachable',
                    'http_status': response.status_code,
                }
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500] if exc.response is not None else str(exc)
            lowered = detail.lower()
            if 'quota' in lowered or 'rate limit' in lowered or '429' in detail:
                status = 'quota_exceeded'
            elif 'api key not valid' in lowered or 'permission denied' in lowered or '401' in detail or '403' in detail:
                status = 'invalid_key'
            else:
                status = 'error'
            return {
                'enabled': True,
                'key_present': True,
                'model': resolved_model,
                'status': status,
                'message': detail,
                'http_status': exc.response.status_code if exc.response is not None else None,
            }
        except httpx.RequestError as exc:
            return {
                'enabled': True,
                'key_present': True,
                'model': resolved_model,
                'status': 'network_error',
                'message': str(exc),
                'http_status': None,
            }

@lru_cache(maxsize=1)
def get_gemini_service() -> GeminiService:
    return GeminiService()
