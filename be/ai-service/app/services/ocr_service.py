"""ocr_service.py — PaddleOCR-based invoice extraction service.

Replaces the legacy Google Vision + Gemini flow with a fully local pipeline.
Model is loaded once as a Singleton to avoid re-initialising on every request.
"""
from __future__ import annotations

import io
import logging
import re
import threading
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PaddleOCR Singleton
# ---------------------------------------------------------------------------

_ocr_instance = None
_ocr_lock = threading.Lock()


def _get_paddle_ocr():
    """Lazy-initialise PaddleOCR exactly once (thread-safe Singleton)."""
    global _ocr_instance
    if _ocr_instance is None:
        with _ocr_lock:
            if _ocr_instance is None:
                try:
                    from paddleocr import PaddleOCR  # type: ignore
                    logger.info("Initialising PaddleOCR (lang=vi) — first call only …")
                    _ocr_instance = PaddleOCR(
                        use_angle_cls=True,
                        lang="vi",
                        show_log=False,
                    )
                    logger.info("PaddleOCR ready.")
                except Exception as exc:  # pragma: no cover
                    logger.error("Failed to initialise PaddleOCR: %s", exc)
                    raise RuntimeError(f"PaddleOCR initialisation failed: {exc}") from exc
    return _ocr_instance


# ---------------------------------------------------------------------------
# Text extraction helpers
# ---------------------------------------------------------------------------

@dataclass
class OcrBlock:
    text: str
    center_x: float
    center_y: float

def _image_bytes_to_numpy(image_bytes: bytes) -> np.ndarray:
    """Convert raw image bytes → BGR numpy array that PaddleOCR accepts."""
    import cv2  # type: ignore  # noqa: PLC0415
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — unsupported format or corrupt data.")
    return img


def _run_ocr(image_bytes: bytes) -> list[OcrBlock]:
    """Run PaddleOCR and return a list of OcrBlock objects with spatial coordinates."""
    ocr = _get_paddle_ocr()
    img = _image_bytes_to_numpy(image_bytes)
    result = ocr.ocr(img, cls=True)

    blocks: list[OcrBlock] = []
    if not result:
        return blocks

    # result structure: [ [ [[box], (text, confidence)], … ] ]
    for page in result:
        if not page:
            continue
        for region in page:
            box = region[0]  # [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
            text: str = region[1][0]
            if not text.strip():
                continue
            
            # Calculate geometric center
            center_x = sum(pt[0] for pt in box) / 4.0
            center_y = sum(pt[1] for pt in box) / 4.0
            
            blocks.append(OcrBlock(text=text.strip(), center_x=center_x, center_y=center_y))

    # Sort by Y-axis so blocks are roughly in reading order from top to bottom
    blocks.sort(key=lambda b: b.center_y)
    return blocks


# ---------------------------------------------------------------------------
# Heuristic extraction logic for Vietnamese invoices
# ---------------------------------------------------------------------------

def remove_accents_and_noise(text: str) -> str:
    """Normalize text by removing accents, lowercasing, and stripping OCR noise."""
    if not text:
        return ""
    # Remove accents using unicodedata
    normalized = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    # Replace specific characters
    stripped = stripped.replace("đ", "d").replace("Đ", "d")
    stripped = stripped.lower()
    # Remove common OCR noise characters
    noise_chars = r"['\"|*]"
    stripped = re.sub(noise_chars, "", stripped)
    return stripped.strip()

# --- Merchant name ---
# Patterns that indicate a mobile phone status bar block (not real receipt content)
_STATUS_BAR_PATTERNS = [
    re.compile(r'^\d{1,2}:\d{2}(\s*(AM|PM|SA|CH))?$', re.IGNORECASE),  # "17:28", "9:41 SA"
    re.compile(r'\d+\s*%\s*$'),                                            # "85%", "100 %"
    re.compile(r'\b(KB/s|MB/s|4G|5G|LTE|Volte|VoLTE)\b', re.IGNORECASE), # network/signal
    re.compile(r'Z8111', re.IGNORECASE),                                   # known junk token
]
# Generic invoice header words that are NOT the merchant name
_MERCHANT_JUNK_WORDS = re.compile(
    r'^(hoa don|hóa đơn|phieu|phiếu|receipt|invoice|cua hang|cửa hàng bán lẻ'
    r'|phieu thanh toan|phiếu thanh toán)$',
    re.IGNORECASE,
)

def _is_status_bar_block(text: str) -> bool:
    """Return True if the block looks like a mobile phone status bar element."""
    t = text.strip()
    return any(p.search(t) for p in _STATUS_BAR_PATTERNS)

def _is_merchant_junk(text: str) -> bool:
    """Return True if the block is a generic invoice header, not a real store name."""
    return bool(_MERCHANT_JUNK_WORDS.match(remove_accents_and_noise(text)))

def _extract_merchant_name(blocks: list[OcrBlock]) -> str | None:
    """Extract merchant name using a Smart Junk Filter.

    Scans the first 7 blocks (sorted top-to-bottom), skips status bar noise
    and generic invoice headers, then joins the first 1-2 valid blocks.
    """
    if not blocks:
        return None

    # Blocks are already sorted by center_y ascending from _run_ocr
    candidates: list[str] = []
    for b in blocks[:7]:
        if _is_status_bar_block(b.text):
            continue
        if _is_merchant_junk(b.text):
            continue
        candidates.append(b.text)
        if len(candidates) >= 2:
            break

    if not candidates:
        return blocks[0].text  # absolute fallback

    name = candidates[0]
    # Append second block only if the first is very short (likely abbreviated)
    if len(name) < 15 and len(candidates) > 1:
        name += " " + candidates[1]
    return name

# --- Total amount ---
# Discount/deduction keywords — blocks matching these are excluded from amount search
_AMOUNT_BLACKLIST = ['chiet khau', 'khau', 'ti&ht khau', 'giam', 'khuyen mai', 'voucher', 'tru tien']

def _extract_total_amount(blocks: list[OcrBlock]) -> int | None:
    """Find the total-payment line using blacklist filtering, priority keywords, and spatial Y-axis matching."""
    if not blocks:
        return None

    # 1. Apply Negative Keyword Blacklist — remove discount lines entirely
    clean_blocks = [
        b for b in blocks
        if not any(kw in remove_accents_and_noise(b.text) for kw in _AMOUNT_BLACKLIST)
    ]
    if not clean_blocks:
        clean_blocks = blocks  # safety fallback

    # 2. Isolate the Bottom 60% (filter out top 40%)
    min_y = min(b.center_y for b in clean_blocks)
    max_y = max(b.center_y for b in clean_blocks)
    threshold_y = min_y + (max_y - min_y) * 0.4
    bottom_blocks = [b for b in clean_blocks if b.center_y > threshold_y]
    if not bottom_blocks:
        bottom_blocks = clean_blocks

    priority_1 = ['thanh to', 'tony tien', 'tong thanh toan', 'thanh toan', 'khach tra']
    priority_2 = ['tong tien', 'tong cong']
    priority_3 = ['thinh tien', 'thanh tien']
    priorities = [priority_1, priority_2, priority_3]

    # No \b boundary — captures the number portion even inside noisy strings like '58,8009' or '58,800d'
    number_pattern = re.compile(r"(\d{1,3}(?:[.,]\d{3})+)")

    keyword_block: OcrBlock | None = None
    best_priority_idx: int = 999
    same_block_value: int | None = None

    # 3. Keyword Search in bottom blocks
    for b in bottom_blocks:
        norm_text = remove_accents_and_noise(b.text)
        for idx, keywords in enumerate(priorities):
            if idx < best_priority_idx:
                for k in keywords:
                    if k in norm_text:
                        keyword_block = b
                        best_priority_idx = idx

                        # 3a. "Same Block" check FIRST — keyword and value in same OCR block
                        all_nums = number_pattern.findall(b.text)
                        if all_nums:
                            raw = all_nums[-1]
                            val = int(re.sub(r"[.,]", "", raw))
                            if val >= 1000:
                                same_block_value = val
                            else:
                                same_block_value = None
                        else:
                            same_block_value = None
                        break

    # Return same-block result immediately if found
    if same_block_value is not None:
        return same_block_value

    # 3b. Spatial Y-axis search — value is in a sibling block on the same row
    if keyword_block:
        same_line_blocks = [
            b for b in clean_blocks
            if abs(b.center_y - keyword_block.center_y) < 25 and b is not keyword_block
        ]
        same_line_blocks.sort(key=lambda b: b.center_x, reverse=True)
        for b in same_line_blocks:
            num_match = number_pattern.search(b.text)
            if num_match:
                val = int(re.sub(r"[.,]", "", num_match.group(0)))
                if val >= 1000:
                    return val

    # 4. Brute-force fallback: scan bottom blocks sorted by Y (top → bottom)
    # Grand total is almost always the LAST large number printed
    candidates: list[tuple[float, int]] = []  # (center_y, value)
    for b in bottom_blocks:
        for raw in number_pattern.findall(b.text):
            val = int(re.sub(r"[.,]", "", raw))
            # Skip loyalty point / hotline-like numbers
            raw_digits = re.sub(r"[.,]", "", raw)
            is_loyalty = len(raw_digits) == 5 and raw_digits.startswith('1')
            if val >= 1000 and not is_loyalty and val not in [18991, 19050, 1900, 1800]:
                candidates.append((b.center_y, val))

    if candidates:
        # Sort by Y descending (bottom-most first) and take the first = last on receipt
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    return None

# --- Transaction date ---
_DATE_PATTERNS = [
    re.compile(r"\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b"),
]

def _extract_date(full_text: str) -> str | None:
    """Return the first parseable date as an ISO 8601 UTC string."""
    for pattern in _DATE_PATTERNS:
        m = pattern.search(full_text)
        if not m:
            continue
        groups = m.groups()
        try:
            day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
            dt = datetime(year, month, day, tzinfo=timezone.utc)
            return dt.isoformat().replace("+00:00", ".000Z")
        except (ValueError, OverflowError):
            continue
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def process_invoice_image(image_bytes: bytes) -> dict[str, Any]:
    """Run PaddleOCR on *image_bytes* and return extracted invoice fields.

    Returns a dict with keys: ``merchantName``, ``totalAmount``, ``transactionDate``.
    Any field that cannot be extracted will be ``None``.
    """
    blocks = _run_ocr(image_bytes)
    logger.debug("OCR extracted %d blocks", len(blocks))

    # Detailed debug output for raw OCR data
    print("\n--- PADDLE OCR RAW DATA ---")
    for b in blocks:
        print(f"Text: {b.text!r:50s} | Y: {b.center_y:7.1f} | X: {b.center_x:7.1f}")
    print("---------------------------\n")

    # Flatten the text blocks for date extraction
    full_text = "\n".join(b.text for b in blocks)

    merchant = _extract_merchant_name(blocks)
    amount = _extract_total_amount(blocks)
    date = _extract_date(full_text)

    # Use current UTC date as fallback when no date can be found on the receipt
    if date is None:
        date = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT00:00:00.000Z")

    return {
        "merchantName": merchant or "Không rõ",
        "totalAmount": amount or 0,
        "transactionDate": date,
    }


# Legacy compat — kept so old import paths don't break
@lru_cache(maxsize=1)
def get_ocr_service():  # noqa: ANN201
    """Return a lightweight shim that delegates to :func:`process_invoice_image`."""

    class _Shim:
        def process_document(self, image_bytes: bytes) -> dict[str, Any]:
            return process_invoice_image(image_bytes)

    return _Shim()
