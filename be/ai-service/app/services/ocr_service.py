import io
import logging
import re
import threading
import unicodedata
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
                    from paddleocr import PaddleOCR
                    logger.info("Initialising PaddleOCR (lang=vi) — first call only …")
                    _ocr_instance = PaddleOCR(
                        use_angle_cls=True,
                        lang="vi",
                        show_log=False,
                    )
                    logger.info("PaddleOCR ready.")
                except Exception as exc:
                    logger.error("Failed to initialise PaddleOCR: %s", exc)
                    raise RuntimeError(f"PaddleOCR initialisation failed: {exc}") from exc
    return _ocr_instance

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def normalize_text(text: str) -> str:
    """Lowercase, remove diacritics, remove special chars except alphanumeric."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    stripped = stripped.replace("đ", "d").replace("Đ", "d").lower()
    # Remove everything except alphanumeric and space
    stripped = re.sub(r'[^a-z0-9\s]', '', stripped)
    return stripped.strip()

def extract_currency_numbers(text: str) -> list[int]:
    """Return a list of integers found in the text using currency regex. Ignore < 1000."""
    pattern = re.compile(r"(\d{1,3}(?:[.,]\d{3})+)")
    results = []
    for raw in pattern.findall(text):
        val = int(re.sub(r"[.,]", "", raw))
        if val >= 1000:
            results.append(val)
    return results

def extract_standard_date(text: str) -> str | None:
    """Find DD/MM/YYYY and return ISO 8601 string."""
    pattern = re.compile(r"\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b")
    m = pattern.search(text)
    if m:
        try:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            dt = datetime(year, month, day, tzinfo=timezone.utc)
            return dt.isoformat().replace("+00:00", ".000Z")
        except ValueError:
            pass
    return None

def extract_vietnamese_date(text: str) -> str | None:
    """Find 'DD tháng MM năm YYYY' and return ISO 8601 string."""
    pattern = re.compile(r"(\d{1,2})\s*thang\s*(\d{1,2})\s*(?:nam\s*)?(\d{4})", re.IGNORECASE)
    m = pattern.search(normalize_text(text))
    if m:
        try:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            dt = datetime(year, month, day, tzinfo=timezone.utc)
            return dt.isoformat().replace("+00:00", ".000Z")
        except ValueError:
            pass
    return None

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------
def extract_digital(blocks: list[dict], img_height: float) -> dict:
    """Strategy 1: For ShopeePay/Digital Wallets"""
    merchant = "Hóa đơn điện tử / App"
    amount = 0
    date = None

    # Amount: Max currency number in the top 45%
    top_blocks = [b for b in blocks if b['y'] < img_height * 0.45]
    candidates = []
    for b in top_blocks:
        candidates.extend(extract_currency_numbers(b['text']))
    if candidates:
        amount = max(candidates)

    # Date: Vietnamese spelled out or DD/MM/YYYY
    full_text = "\n".join(b['text'] for b in blocks)
    date = extract_vietnamese_date(full_text) or extract_standard_date(full_text)

    return {"merchantName": merchant, "totalAmount": amount, "transactionDate": date}

def extract_tabular(blocks: list[dict], img_height: float) -> dict:
    """Strategy 2: For EVN / VAT invoices"""
    merchant = ""
    amount = 0
    date = None
    
    full_text = "\n".join(b['text'] for b in blocks)

    # Merchant: Scan top 20%, ignore "mau so", "ky hieu", look for "cong ty", "dien luc"
    top_blocks = [b for b in blocks if b['y'] < img_height * 0.20]
    for b in top_blocks:
        norm = normalize_text(b['text'])
        if "mau so" in norm or "ky hieu" in norm:
            continue
        if "cong ty" in norm or "dien luc" in norm:
            merchant = b['text']
            break

    # Amount: Find "tong cong" or "thanh toan", look same line largest X
    target_y = None
    for b in blocks:
        norm = normalize_text(b['text'])
        if "tong cong" in norm or "thanh toan" in norm:
            target_y = b['y']
            break
            
    if target_y is not None:
        same_line_blocks = [b for b in blocks if abs(b['y'] - target_y) < 25]
        same_line_blocks.sort(key=lambda b: b['x'], reverse=True)
        for b in same_line_blocks:
            nums = extract_currency_numbers(b['text'])
            if nums:
                amount = nums[0]
                break

    # Date
    date = extract_standard_date(full_text)

    return {"merchantName": merchant, "totalAmount": amount, "transactionDate": date}

def extract_retail(blocks: list[dict], img_height: float) -> dict:
    """Strategy 3: For Retail / Physical receipts (Katinat, Bong Tra)"""
    merchant = ""
    amount = 0
    date = None

    # Merchant: Scan top 15%, ignore status bar (\d:\d{2}, %), join first 2 surviving
    top_blocks = [b for b in blocks if b['y'] < img_height * 0.15]
    valid_merchant_blocks = []
    status_bar_patterns = [re.compile(r'\d{1,2}:\d{2}'), re.compile(r'%')]
    for b in top_blocks:
        if any(p.search(b['text']) for p in status_bar_patterns):
            continue
        valid_merchant_blocks.append(b['text'])
        if len(valid_merchant_blocks) == 2:
            break
            
    if valid_merchant_blocks:
        merchant = " ".join(valid_merchant_blocks)

    # Amount
    blacklist = ['chiet khau', 'giam', 'khuyen mai']
    keywords = ['thanh to', 'tong tien', 'thanh toan']
    
    # Filter blacklist
    clean_blocks = [b for b in blocks if not any(kw in normalize_text(b['text']) for kw in blacklist)]
    
    amount_found = False
    for b in clean_blocks:
        norm = normalize_text(b['text'])
        if any(kw in norm for kw in keywords):
            # Same block check
            nums = extract_currency_numbers(b['text'])
            if nums:
                amount = nums[-1]
                amount_found = True
                break
            # Same Y-axis check
            same_line = [other for other in clean_blocks if abs(other['y'] - b['y']) < 25 and other != b]
            same_line.sort(key=lambda x: x['x'], reverse=True)
            for sl_b in same_line:
                sl_nums = extract_currency_numbers(sl_b['text'])
                if sl_nums:
                    amount = sl_nums[0]
                    amount_found = True
                    break
            if amount_found:
                break
                
    # Fallback: Max currency number in bottom 30%
    if not amount_found:
        bottom_blocks = [b for b in clean_blocks if b['y'] > img_height * 0.70]
        candidates = []
        for b in bottom_blocks:
            candidates.extend(extract_currency_numbers(b['text']))
        if candidates:
            amount = max(candidates)

    # Date
    full_text = "\n".join(b['text'] for b in blocks)
    date = extract_standard_date(full_text)

    return {"merchantName": merchant, "totalAmount": amount, "transactionDate": date}

# ---------------------------------------------------------------------------
# Main Execution / Router
# ---------------------------------------------------------------------------
def process_invoice_image(image_bytes: bytes) -> dict[str, Any]:
    """Decodes image, runs PaddleOCR, creates block dicts, and routes to correct strategy."""
    try:
        import cv2
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image.")

        ocr = _get_paddle_ocr()
        result = ocr.ocr(img, cls=True)

        blocks = []
        if result and result[0]:
            for region in result[0]:
                box = region[0]
                text = region[1][0]
                if not text.strip():
                    continue
                center_x = sum(pt[0] for pt in box) / 4.0
                center_y = sum(pt[1] for pt in box) / 4.0
                blocks.append({'text': text.strip(), 'x': center_x, 'y': center_y})
                
        blocks.sort(key=lambda b: b['y'])

        print("\n--- PADDLE OCR BLOCKS ---")
        for b in blocks:
            print(f"Text: {b['text']!r:50s} | X: {b['x']:7.1f} | Y: {b['y']:7.1f}")
        print("-------------------------\n")

        if not blocks:
            return {"merchantName": "Không rõ", "totalAmount": 0, "transactionDate": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT00:00:00.000Z")}

        img_height = max(b['y'] for b in blocks)
        full_normalized_text = " ".join(normalize_text(b['text']) for b in blocks)

        # Route Strategy
        if "chi tiet" in full_normalized_text or "giao dich" in full_normalized_text:
            logger.info("Routing to Strategy 1: DIGITAL")
            data = extract_digital(blocks, img_height)
        elif "gtgt" in full_normalized_text or "dien luc" in full_normalized_text or "mau so" in full_normalized_text:
            logger.info("Routing to Strategy 2: TABULAR")
            data = extract_tabular(blocks, img_height)
        else:
            logger.info("Routing to Strategy 3: RETAIL")
            data = extract_retail(blocks, img_height)

        # Fallbacks for empty data
        if not data.get("merchantName"):
            data["merchantName"] = "Không rõ"
        if not data.get("totalAmount"):
            data["totalAmount"] = 0
        if not data.get("transactionDate"):
            data["transactionDate"] = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT00:00:00.000Z")

        return data

    except Exception as e:
        logger.error(f"OCR Extraction failed: {e}")
        return {
            "merchantName": "Lỗi trích xuất",
            "totalAmount": 0,
            "transactionDate": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT00:00:00.000Z")
        }

@lru_cache(maxsize=1)
def get_ocr_service():
    """Shim for DI."""
    class _Shim:
        def process_document(self, image_bytes: bytes) -> dict[str, Any]:
            return process_invoice_image(image_bytes)
    return _Shim()
