import logging
from django.core.management.base import BaseCommand
from core.rabbitmq import RabbitMQClient
from apps.ocr.services import OCRService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Start OCR consumer (ai.ocr.queue)'

    def handle(self, *args, **options):
        client = RabbitMQClient()
        queue_name = 'ai.ocr.queue'
        routing_key = 'transaction.ocr.requested'

        def on_message(data):
            transaction_id = data.get('transaction_id')
            image_url = data.get('image_url')
            if not transaction_id or not image_url:
                logger.error(f'Invalid message: {data}')
                return
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

        client.setup_consumer(queue_name, routing_key, on_message)
