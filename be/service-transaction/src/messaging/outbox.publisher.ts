import {
  EXCHANGES,
  publishMessage,
  QUEUES,
  ROUTING_KEYS,
} from '../config/rabbitmq';
import { OutboxModel } from '../models/outbox.model';

class OutboxPublisher {
  private timer: NodeJS.Timeout | null = null;

  async start(intervalMs = 5000) {
    if (this.timer) return;

    await this.publishPending();
    this.timer = setInterval(() => {
      this.publishPending().catch((error) => {
        console.error('[outbox-publisher] publishPending failed', error);
      });
    }, intervalMs);
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async publishPending() {
    const pending = await OutboxModel.find({ published: false }).sort({ createdAt: 1 }).limit(20);
    if (pending.length === 0) return;

    for (const event of pending) {
      if (event.event_type !== 'TransactionCreated') continue;

      await publishMessage(EXCHANGES.TRANSACTION_EVENTS, ROUTING_KEYS.TRANSACTION_CREATED, {
        eventType: 'TransactionCreated',
        payload: event.payload,
      });

      event.published = true;
      event.published_at = new Date();
      await event.save();
    }
  }
}

export const outboxPublisher = new OutboxPublisher();
