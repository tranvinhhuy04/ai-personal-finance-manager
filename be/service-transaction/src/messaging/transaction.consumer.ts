import { Channel, ConsumeMessage } from 'amqplib';
import {
  EXCHANGES,
  getChannel,
  QUEUES,
  ROUTING_KEYS,
} from '../../config/rabbitmq';
import { transactionService } from '../services/transaction.service';

type WalletBalanceUpdatedEvent = {
  eventType: 'WalletBalanceUpdated';
  transactionId: string;
};

type WalletBalanceUpdateFailedEvent = {
  eventType: 'WalletBalanceUpdateFailed';
  transactionId: string;
  error: string;
};

class TransactionConsumer {
  private isRunning = false;

  async start() {
    if (this.isRunning) return;

    const channel = await getChannel();

    await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
    await channel.assertQueue(QUEUES.WALLET_RESPONSES, { durable: true });

    await channel.bindQueue(QUEUES.WALLET_RESPONSES, EXCHANGES.WALLET_EVENTS, ROUTING_KEYS.WALLET_BALANCE_UPDATED);
    await channel.bindQueue(
      QUEUES.WALLET_RESPONSES,
      EXCHANGES.WALLET_EVENTS,
      ROUTING_KEYS.WALLET_BALANCE_UPDATE_FAILED
    );

    await channel.consume(QUEUES.WALLET_RESPONSES, (msg) => this.handleMessage(channel, msg));
    this.isRunning = true;
    console.log('Transaction consumer started');
  }

  async stop() {
    this.isRunning = false;
  }

  private async handleMessage(channel: Channel, msg: ConsumeMessage | null) {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as WalletBalanceUpdatedEvent | WalletBalanceUpdateFailedEvent;

      if (event.eventType === 'WalletBalanceUpdated') {
        await transactionService.markCompleted(event.transactionId);
      }

      if (event.eventType === 'WalletBalanceUpdateFailed') {
        await transactionService.markFailed(event.transactionId);
      }

      channel.ack(msg);
    } catch (error) {
      console.error('[transaction-consumer] failed to process message', error);
      channel.ack(msg);
    }
  }
}

export default new TransactionConsumer();
