import { getChannel, QUEUES, ROUTING_KEYS } from '../config/rabbitmq';
import walletService from '../services/WalletService';
import Decimal from 'decimal.js';
import {
  TransactionCreatedEnvelope,
  WalletBalanceUpdatedPayload,
  WalletBalanceUpdateFailedPayload,
} from '../types/events';

export class WalletConsumer {
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.log('Wallet Consumer is already running');
      return;
    }

    try {
      const channel = await getChannel();

      // Bind queue to exchange with routing key
      await channel.bindQueue(
        QUEUES.WALLET_BALANCE_UPDATES,
        'transaction.events',
        ROUTING_KEYS.TRANSACTION_CREATED
      );

      // Start consuming
      await channel.consume(QUEUES.WALLET_BALANCE_UPDATES, async (msg) => {
        if (!msg) return;

        try {
          const event: TransactionCreatedEnvelope = JSON.parse(msg.content.toString());
          console.log(`Received TransactionCreated event: ${event.aggregateId}`);

          await this.handleTransactionCreated(event);

          // Acknowledge message
          channel.ack(msg);
        } catch (err) {
          console.error('Error processing message:', err);
          // Reject and requeue for retry
          channel.nack(msg, false, true);
        }
      });

      this.isRunning = true;
      console.log('✓ Wallet Consumer started');
    } catch (err) {
      console.error('Error starting Wallet Consumer:', err);
      throw err;
    }
  }

  private async handleTransactionCreated(event: TransactionCreatedEnvelope) {
    const { payload } = event;
    const { transactionId, walletId, amount, transactionType } = payload;

    // Calculate amount to add/subtract based on transaction type
    let amountToApply = new Decimal(amount);
    if (transactionType === 'EXPENSE') {
      amountToApply = amountToApply.negated(); // Subtract for expense
    }

    console.log(`Processing balance update for wallet ${walletId}: ${amountToApply}`);

    const result = await walletService.updateBalanceForTransaction(
      walletId,
      amountToApply
    );

    if (result.success && result.wallet) {
      await this.publishWalletBalanceUpdated(transactionId, walletId, result.wallet);
      console.log(`✓ Wallet balance updated for transaction ${transactionId}`);
    } else {
      // Publish failure event for SAGA compensation
      await this.publishWalletBalanceUpdateFailed(
        transactionId,
        walletId,
        result.error ?? 'Unknown error'
      );
      console.log(`✗ Wallet balance update failed for transaction ${transactionId}: ${result.error}`);
    }
  }

  private async publishWalletBalanceUpdated(
    transactionId: string,
    walletId: string,
    wallet: { balance: { toString(): string }; version: number }
  ) {
    const channel = await getChannel();
    const payload: WalletBalanceUpdatedPayload = {
      eventType: 'WalletBalanceUpdated',
      transactionId,
      walletId,
      newBalance: wallet.balance.toString(),
      newVersion: wallet.version,
      timestamp: new Date().toISOString(),
    };

    await channel.publish(
      'wallet.events',
      ROUTING_KEYS.WALLET_BALANCE_UPDATED,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
  }

  private async publishWalletBalanceUpdateFailed(
    transactionId: string,
    walletId: string,
    error: string
  ) {
    const channel = await getChannel();
    const payload: WalletBalanceUpdateFailedPayload = {
      eventType: 'WalletBalanceUpdateFailed',
      transactionId,
      walletId,
      error,
      timestamp: new Date().toISOString(),
    };

    await channel.publish(
      'wallet.events',
      ROUTING_KEYS.WALLET_BALANCE_UPDATE_FAILED,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
  }

  async stop() {
    this.isRunning = false;
    console.log('✓ Wallet Consumer stopped');
  }
}

export default new WalletConsumer();
