from __future__ import annotations

from functools import lru_cache


class OCRService:
    """Legacy placeholder kept only to avoid accidental imports from old code paths.

    Invoice extraction has moved to the Node.js `POST /api/v1/invoices/extract`
    endpoint, which now uses Google Vision + Gemini for better accuracy.
    """

    def process_document(self, *args, **kwargs):
        raise RuntimeError(
            "Legacy OCR flow has been retired. Use POST /api/v1/invoices/extract in the Node.js transaction service instead."
        )


@lru_cache(maxsize=1)
def get_ocr_service() -> OCRService:
    return OCRService()
