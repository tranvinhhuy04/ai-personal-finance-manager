from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

import httpx

GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')


# ---------------------------------------------------------------------------
# Helper: kiểm tra xem HTTP status / body có phải lỗi quota/rate-limit không
# ---------------------------------------------------------------------------

def _is_quota_error(status_code: int, body: str) -> bool:
    """Trả về True nếu lỗi là 429 hoặc 403 quota/rate-limit."""
    if status_code == 429:
        return True
    if status_code == 403:
        lowered = body.lower()
        return 'quota' in lowered or 'rate limit' in lowered or 'rateLimitExceeded' in body
    return False


# ---------------------------------------------------------------------------
# Auto-Rotation: thử lần lượt từng key trong pool, bỏ qua key bị quota
# ---------------------------------------------------------------------------

async def call_gemini_with_rotation(
    *,
    api_keys: list[dict[str, Any]],  # [{key: str, index: int}, ...]
    model: str,
    payload: dict[str, Any],
    timeout: float = 20.0,
    connect_timeout: float = 5.0,
) -> tuple[dict[str, Any], list[int]]:
    """Gọi Gemini API với cơ chế auto-rotate qua pool keys.

    Returns:
        (response_data, exhausted_indices)  — response_data là JSON đã parse,
        exhausted_indices là danh sách index của các keys bị quota.

    Raises:
        RuntimeError: khi tất cả keys đều bị quota hoặc không có key nào.
    """
    if not api_keys:
        raise RuntimeError('Vui lòng cập nhật API Key để sử dụng tính năng này.')

    exhausted_indices: list[int] = []
    last_error = 'Không có key hợp lệ trong pool.'

    for entry in api_keys:
        key = str(entry.get('key') or '').strip()
        key_index = int(entry.get('index', -1))

        if not key:
            continue

        url = GeminiService._build_url(model, key)
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=connect_timeout)) as client:
                response = await client.post(url, json=payload)

                if _is_quota_error(response.status_code, response.text):
                    exhausted_indices.append(key_index)
                    last_error = f'Key index={key_index}: quota/rate-limit ({response.status_code})'
                    continue  # thử key tiếp theo

                response.raise_for_status()
                return response.json(), exhausted_indices

        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500] if exc.response is not None else str(exc)
            status = exc.response.status_code if exc.response is not None else 0
            if _is_quota_error(status, body):
                exhausted_indices.append(key_index)
                last_error = f'Key index={key_index}: quota/rate-limit ({status})'
                continue
            # Lỗi thực sự (invalid key, server error…) — dừng ngay
            raise RuntimeError(f'Gemini API HTTP error: {body}') from exc

        except httpx.RequestError as exc:
            raise RuntimeError(f'Unable to reach Gemini API: {exc}') from exc

    raise RuntimeError(
        f'Tất cả API Keys đã hết Quota. Vui lòng cập nhật API Key. Chi tiết: {last_error}'
    )


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
        model_override: str | None = None,
        api_key_override: str | None = None,
    ) -> str | None:
        credentials = self._effective_credentials(model_override=model_override, api_key_override=api_key_override)
        if not credentials:
            return None
        model, api_key = credentials

        # Hướng dẫn thêm dựa vào sub_type được gửi kèm
        sub_type = context.get('_sub_type', '') if isinstance(context, dict) else ''
        sub_type_instruction = ''
        if sub_type == 'category_breakdown':
            sub_type_instruction = (
                'Người dùng hỏi về DANH MỤC nào chi nhiều nhất. '
                'Bắt buộc nêu tên danh mục cao nhất và số tiền cụ thể từ topExpenses. '
                'Không được bắt đầu bằng tổng chi tiêu. '
            )
        elif sub_type == 'total_amount':
            sub_type_instruction = (
                'Người dùng hỏi về TỔNG chi tiêu. '
                'Chỉ nêu tổng số và nhận xét ngắn gọn. '
            )

        prompt = (
            'Bạn là Senior AI Financial Assistant cho ứng dụng quản lý tài chính cá nhân. '
            'Trả lời bằng tiếng Việt tự nhiên, súc tích và hữu ích trong 2-4 câu ngắn. '
            'Tuyệt đối không bịa số liệu: chỉ dùng số từ financialContext/context. '
            + sub_type_instruction
            + f'Intent đã nhận diện: {intent}.\n'
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
                response = await client.post(self._build_url(model, api_key), json=payload)
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
        api_keys_override: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any] | None:
        """Trích xuất giao dịch từ văn bản tự do.

        Khi `api_keys_override` được cung cấp (pool nhiều keys), hàm sẽ sử dụng
        cơ chế auto-rotation. Trả về dict bổ sung trường `exhausted_key_indices`.
        """
        model = (model_override or self.model or '').strip()
        if not model:
            return None

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

        # --- Pool rotation path ---
        if api_keys_override:
            data, exhausted_indices = await call_gemini_with_rotation(
                api_keys=api_keys_override,
                model=model,
                payload=payload,
                timeout=20.0,
                connect_timeout=5.0,
            )
            generated = self._extract_text(data)
            if not generated:
                generated = '[]'
            return {
                'text': generated.strip(),
                'model': model,
                'usage': self._extract_usage(data),
                'exhausted_key_indices': exhausted_indices,
            }

        # --- Single key path (legacy / fallback) ---
        credentials = self._effective_credentials(model_override=model_override, api_key_override=api_key_override)
        if not credentials:
            return None
        _, api_key = credentials

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
                response = await client.post(self._build_url(model, api_key), json=payload)
                response.raise_for_status()
                data = response.json()
                generated = self._extract_text(data)
                if not generated:
                    generated = '[]'
                return {
                    'text': generated.strip(),
                    'model': model,
                    'usage': self._extract_usage(data),
                    'exhausted_key_indices': [],
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
