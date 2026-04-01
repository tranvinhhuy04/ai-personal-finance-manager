

import logging
import os
import re
import requests
import numpy as np
from PIL import Image
from io import BytesIO
import easyocr
import openai
from core.rabbitmq import RabbitMQClient
from django.conf import settings

logger = logging.getLogger(__name__)

class OCRService:
    _reader = None

    @classmethod
    def get_reader(cls):
        if cls._reader is None:
            cls._reader = easyocr.Reader(['vi', 'en'], gpu=False)
        return cls._reader

    @staticmethod
    def read_image(image_path_or_url):
        try:
            if image_path_or_url.startswith('http'):
                resp = requests.get(image_path_or_url, timeout=10)
                resp.raise_for_status()
                img = Image.open(BytesIO(resp.content)).convert('RGB')
            else:
                img = Image.open(image_path_or_url).convert('RGB')
            return np.array(img)
        except Exception as e:
            logger.error(f"Failed to load image: {e}")
            return None

    @classmethod
    def ocr(cls, image_path_or_url):
        reader = cls.get_reader()
        img = cls.read_image(image_path_or_url)
        if img is None:
            return '', 0.0
        try:
            result = reader.readtext(img, detail=0, paragraph=True)
            text = '\n'.join(result)
            confidence = 1.0 if result else 0.0
            return text, confidence
        except Exception as e:
            logger.error(f"EasyOCR failed: {e}")
            return '', 0.0

    @staticmethod
    def parse_with_llm(raw_text):
        openai.api_key = getattr(settings, 'OPENAI_API_KEY', os.getenv('OPENAI_API_KEY'))
        prompt = (
            "Bạn là chuyên gia kế toán Việt Nam. Hãy trích xuất từ văn bản OCR sau thành JSON: "
            "amount (số tiền kiểu Number), merchant (tên cửa hàng), date (định dạng YYYY-MM-DD), "
            "category (chọn 1: Dining, Transport, Shopping, Utilities, Electronics, Others). "
            f"Văn bản: {raw_text}"
        )
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=256
            )
            content = response.choices[0].message.content
            import json
            return json.loads(content)
        except Exception as e:
            logger.warning(f"LLM extraction failed: {e}")
            # Fallback: Regex for amount, category Others
            amount = 0
            date = ''
            merchant = ''
            # Find amount (VND)
            m = re.search(r'(\d{2,}[.,]?\d*)\s?(?:VND|₫)?', raw_text.replace(',', ''))
            if m:
                try:
                    amount = float(m.group(1))
                except Exception:
                    amount = 0
            # Find date (YYYY-MM-DD)
            d = re.search(r'(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})', raw_text)
            if d:
                date = d.group(1).replace('/', '-').replace('.', '-')
            # Find merchant (first line)
            lines = raw_text.split('\n')
            if lines:
                merchant = lines[0][:64]
            return {
                "amount": amount,
                "merchant": merchant,
                "date": date,
                "category": "Others"
            }

    @classmethod
    def extract(cls, image_path_or_url):
        raw_text, confidence = cls.ocr(image_path_or_url)
        if not raw_text or confidence < 0.2:
            return {
                "amount": 0,
                "merchant": "",
                "date": "",
                "category": "Others",
                "confidence": confidence,
                "status": "FAILED"
            }
        data = cls.parse_with_llm(raw_text)
        # Chuẩn hóa output
        return {
            "amount": float(data.get("amount", 0)),
            "merchant": data.get("merchant", ""),
            "date": data.get("date", ""),
            "category": data.get("category", "Others"),
            "confidence": confidence,
            "status": "COMPLETED"
        }

def process_ocr_request(transaction_id, image_url):
    logger = logging.getLogger(__name__)
    client = RabbitMQClient()
    try:
        result = OCRService.extract(image_url)
        payload = {
            "transaction_id": transaction_id,
            **result
        }
        client.publish(
            routing_key="transaction.ocr.completed",
            body=payload
        )
        logger.info(f"OCR completed and published for transaction {transaction_id}")
    except Exception as e:
        logger.error(f"OCR failed for transaction {transaction_id}: {e}")
        fail_payload = {
            "transaction_id": transaction_id,
            "status": "FAILED",
            "amount": 0,
            "error": str(e)
        }
        client.publish(
            routing_key="transaction.ocr.completed",
            body=fail_payload
        )
