import { getChannel, EXCHANGES, ROUTING_KEYS } from '../config/rabbitmq';
import { outboxRepository } from '../repositories/TransactionRepository';

/**
 * Outbox Publisher Service
 * Periodically polls the Outbox collection and publishes unpublished events to RabbitMQ.
 * This ensures reliable delivery of events even if the message broker is temporarily down.
 */

export class OutboxPublisher {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start(pollIntervalMs: number = 5000) {
    if (this.isRunning) {
      console.log('Outbox Publisher is already running');
      return;
    }

    this.isRunning = true;
    console.log(`✓ Outbox Publisher started (polling every ${pollIntervalMs}ms)`);

    this.pollingInterval = setInterval(async () => {
      try {
        await this.publishUnpublishedEvents();
      } catch (err) {
        console.error('Error in Outbox Publisher:', err);
      }
    }, pollIntervalMs);
  }

  async stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    console.log('✓ Outbox Publisher stopped');
  }

  private async publishUnpublishedEvents() {
    const channel = await getChannel();
    const unpublishedEvents = await outboxRepository.findUnpublishedEvents(10);

    if (unpublishedEvents.length === 0) {
      return; // No events to publish
    }

    console.log(`Publishing ${unpublishedEvents.length} unpublished event(s)...`);

    for (const event of unpublishedEvents) {
      try {
        const routingKey = this.getRoutingKey(event.eventType);
        const message = JSON.stringify({
          eventId: event._id.toString(),
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          payload: event.payload,
          createdAt: event.createdAt,
        });

        // Publish to RabbitMQ with persistent flag
        const published = await channel.publish(
          EXCHANGES.TRANSACTION_EVENTS,
          routingKey,
          Buffer.from(message),
          { persistent: true }
        );

        if (published) {
          // Mark event as published in Outbox
          await outboxRepository.markEventAsPublished(event._id.toString());
          console.log(`✓ Event published: ${event.eventType} (${event.aggregateId})`);
        } else {
          console.warn(`⚠ Failed to publish event: ${event.eventType} (${event.aggregateId})`);
        }
      } catch (err) {
        console.error(`Error publishing event ${event._id}:`, err);
      }
    }
  }

  private getRoutingKey(eventType: string): string {
    if (eventType === 'TransactionCreated') {
      return ROUTING_KEYS.TRANSACTION_CREATED;
    }
    return eventType.toLowerCase();
  }
}

export default new OutboxPublisher();
