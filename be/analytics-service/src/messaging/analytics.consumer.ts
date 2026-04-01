import { ConsumeMessage } from 'amqplib';
import { getChannel, QUEUES } from '../../config/rabbitmq';
import { analyticsService } from '../services/analytics.service';
import { TransactionEvent } from '../../types/events';

class AnalyticsConsumer {
  private isRunning = false;

  async start() {
    if (this.isRunning) return;

    const channel = await getChannel();
    await channel.consume(QUEUES.ANALYTICS_TRANSACTION_EVENTS, (msg) => this.handleMessage(msg));
    this.isRunning = true;
    console.log('Analytics consumer started');
  }

  async stop() {
    this.isRunning = false;
  }

  private async handleMessage(msg: ConsumeMessage | null) {
    if (!msg) return;

    const channel = await getChannel();

    try {
      const event = JSON.parse(msg.content.toString()) as TransactionEvent;
      if (!event?.payload) {
        channel.ack(msg);
        return;
      }

      const amount = Number(event.payload.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        channel.ack(msg);
        return;
      }

      await analyticsService.applyTransactionEvent({
        userId: event.payload.userId,
        walletId: event.payload.walletId,
        walletName: event.payload.walletName,
        categoryId: event.payload.categoryId,
        categoryName: event.payload.categoryName,
        transactionType: event.payload.transactionType,
        amount,
        occurredAt: event.payload.occurredAt,
      });

      channel.ack(msg);
    } catch (error) {
      console.error('[analytics-consumer] failed to process message', error);
      channel.ack(msg);
    }
  }
}

export const analyticsConsumer = new AnalyticsConsumer();
