import os
import json
import time
import logging
import pika
from pika.exceptions import AMQPConnectionError
from threading import Lock

logger = logging.getLogger(__name__)

class RabbitMQClient:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance

    def _init(self):
        self.exchange_name = 'transaction.events'
        self.exchange_type = 'topic'
        self._connect()

    def _connect(self):
        while True:
            try:
                url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
                params = pika.URLParameters(url)
                self.connection = pika.BlockingConnection(params)
                self.channel = self.connection.channel()
                self.channel.exchange_declare(exchange=self.exchange_name, exchange_type=self.exchange_type, durable=True)
                logger.info('Connected to RabbitMQ and declared exchange.')
                break
            except AMQPConnectionError as e:
                logger.warning(f'RabbitMQ not ready, retrying in 3s: {e}')
                time.sleep(3)

    def publish(self, routing_key, body: dict):
        try:
            self.channel.basic_publish(
                exchange=self.exchange_name,
                routing_key=routing_key,
                body=json.dumps(body),
                properties=pika.BasicProperties(content_type='application/json', delivery_mode=2)
            )
            logger.info(f'Published to {self.exchange_name}:{routing_key} - {body}')
        except AMQPConnectionError:
            logger.error('Lost connection to RabbitMQ, reconnecting...')
            self._connect()
            self.publish(routing_key, body)

    def setup_consumer(self, queue_name, routing_key, callback):
        while True:
            try:
                self.channel.queue_declare(queue=queue_name, durable=True)
                self.channel.queue_bind(queue=queue_name, exchange=self.exchange_name, routing_key=routing_key)
                logger.info(f'Queue {queue_name} bound to {self.exchange_name}:{routing_key}')
                break
            except AMQPConnectionError:
                logger.warning('RabbitMQ not ready for queue declare/bind, retrying in 3s')
                self._connect()
                time.sleep(3)

        def _on_message(ch, method, properties, body):
            try:
                data = json.loads(body)
                callback(data)
                ch.basic_ack(delivery_tag=method.delivery_tag)
                logger.info(f'Message processed and acked: {data}')
            except Exception as e:
                logger.error(f'Error processing message: {e}')
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        self.channel.basic_qos(prefetch_count=1)
        self.channel.basic_consume(queue=queue_name, on_message_callback=_on_message)
        logger.info(f'Start consuming queue: {queue_name}')
        self.channel.start_consuming()
