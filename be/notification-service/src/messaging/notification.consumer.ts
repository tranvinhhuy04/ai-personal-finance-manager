import { ConsumeMessage } from 'amqplib';
import { getChannel, QUEUES } from '../../config/rabbitmq';
import { notificationService } from '../services/notification.service';
import { WalletBalanceUpdatedEvent } from '../../types/events';

class NotificationConsumer {
  private isRunning = false;

  async start() {
    if (this.isRunning) return;

    const channel = await getChannel();
    await channel.consume(QUEUES.NOTIFICATION_WALLET_EVENTS, (msg) => this.handleMessage(msg));
    this.isRunning = true;
    console.log('Notification consumer started');
  }

  async stop() {
    this.isRunning = false;
  }

  private async handleMessage(msg: ConsumeMessage | null) {
    if (!msg) return;

    const channel = await getChannel();

    try {
      const event = JSON.parse(msg.content.toString()) as WalletBalanceUpdatedEvent;
      if (event?.eventType !== 'WalletBalanceUpdated') {
        channel.ack(msg);
        return;
      }

      await notificationService.createThresholdAlert({
        userId: event.userId,
        walletId: event.walletId,
        walletName: event.walletName,
        newBalance: Number(event.newBalance),
        spendingLimit: event.spendingLimit,
      });

      channel.ack(msg);
    } catch (error) {
      console.error('[notification-consumer] failed to process message', error);
      channel.ack(msg);
    }
  }
}

export const notificationConsumer = new NotificationConsumer();
