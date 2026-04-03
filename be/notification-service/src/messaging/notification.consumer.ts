import { ConsumeMessage } from 'amqplib';
import { getChannel, QUEUES } from '../../config/rabbitmq';
import { NotificationRequestedEvent, WalletBalanceUpdatedEvent } from '../../types/events';
import { notificationService } from '../services/notification.service';

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
      const event = JSON.parse(msg.content.toString()) as WalletBalanceUpdatedEvent | NotificationRequestedEvent;

      if (event?.eventType === 'NotificationRequested') {
        const payload = event.payload;
        await notificationService.createNotification({
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          metadata: payload.metadata,
          createdAt: payload.createdAt,
        });
        channel.ack(msg);
        return;
      }

      if (event?.eventType === 'WalletBalanceUpdated') {
        const userId = event.userId || String((event as any).payload?.userId ?? '');
        if (userId) {
          await notificationService.createNotification({
            userId,
            title: 'Biến động số dư ví',
            message: `Ví của bạn vừa thay đổi số dư. Số dư mới là ${Number(event.newBalance ?? 0).toLocaleString('vi-VN')}đ.`,
            type: 'INFO',
            metadata: {
              walletId: event.walletId,
              transactionId: event.transactionId ?? null,
              eventType: event.eventType,
            },
            createdAt: event.timestamp,
          });
        }

        channel.ack(msg);
        return;
      }

      channel.ack(msg);
    } catch (error) {
      console.error('[notification-consumer] failed to process message', error);
      channel.ack(msg);
    }
  }
}

export const notificationConsumer = new NotificationConsumer();
