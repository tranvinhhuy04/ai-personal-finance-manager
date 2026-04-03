import { Channel, ConsumeMessage } from 'amqplib';
import {
  EXCHANGES,
  getChannel,
  publishMessage,
  QUEUES,
  ROUTING_KEYS,
} from '../config/rabbitmq';
import { walletService } from '../services/wallet.service';

type TransactionCreatedEvent = {
  eventType: 'TransactionCreated';
  payload: {
    transactionId: string;
    walletId: string;
    amount: string;
    transactionType: 'INCOME' | 'EXPENSE';
  };
};

class WalletConsumer {
  private isRunning = false;

  async start() {
    if (this.isRunning) return;

    const channel = await getChannel();
    await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
    await channel.assertQueue(QUEUES.WALLET_BALANCE_UPDATES, { durable: true });
    await channel.bindQueue(
      QUEUES.WALLET_BALANCE_UPDATES,
      EXCHANGES.TRANSACTION_EVENTS,
      ROUTING_KEYS.TRANSACTION_CREATED
    );

    await channel.consume(QUEUES.WALLET_BALANCE_UPDATES, (msg) => this.handleMessage(channel, msg));
    this.isRunning = true;
    console.log('Wallet consumer started');
  }

  async stop() {
    this.isRunning = false;
  }

  private async handleMessage(channel: Channel, msg: ConsumeMessage | null) {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as TransactionCreatedEvent;
      if (event.eventType !== 'TransactionCreated') {
        channel.ack(msg);
        return;
      }

      const { transactionId, walletId, amount, transactionType } = event.payload;

      const update = await walletService.applyTransactionWithOptimisticLock({
        wallet_id: walletId,
        amount,
        transaction_type: transactionType,
        transaction_id: transactionId,
      });

      if (update.success && update.duplicate) {
        console.log(`[wallet-consumer] duplicate transaction ignored: ${transactionId}`);
        channel.ack(msg);
        return;
      }

      if (update.success && update.wallet) {
        await publishMessage(EXCHANGES.WALLET_EVENTS, ROUTING_KEYS.WALLET_BALANCE_UPDATED, {
          eventType: 'WalletBalanceUpdated',
          transactionId,
          walletId,
          newBalance: update.wallet.balance,
          newVersion: update.wallet.version,
          timestamp: new Date().toISOString(),
        });
      } else {
        await publishMessage(EXCHANGES.WALLET_EVENTS, ROUTING_KEYS.WALLET_BALANCE_UPDATE_FAILED, {
          eventType: 'WalletBalanceUpdateFailed',
          transactionId,
          walletId,
          error: update.error || 'Failed to update balance',
          timestamp: new Date().toISOString(),
        });
      }

      channel.ack(msg);
    } catch (error) {
      console.error('[wallet-consumer] failed to process message', error);
      channel.ack(msg);
    }
  }
}

export default new WalletConsumer();
