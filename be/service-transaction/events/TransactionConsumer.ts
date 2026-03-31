import { getChannel, QUEUES, ROUTING_KEYS } from '../config/rabbitmq';
import transactionService from '../services/TransactionService';
import {
  WalletBalanceUpdatedPayload,
  WalletBalanceUpdateFailedPayload,
} from '../types/events';

type WalletResponseEvent = WalletBalanceUpdatedPayload | WalletBalanceUpdateFailedPayload;

export class TransactionConsumer {
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.log('Transaction Consumer is already running');
      return;
    }

    try {
      const channel = await getChannel();

      // Bind queue to exchange with routing keys
      await channel.bindQueue(
        QUEUES.WALLET_RESPONSES,
        'wallet.events',
        ROUTING_KEYS.WALLET_BALANCE_UPDATED
      );

      await channel.bindQueue(
        QUEUES.WALLET_RESPONSES,
        'wallet.events',
        ROUTING_KEYS.WALLET_BALANCE_UPDATE_FAILED
      );

      // Start consuming
      await channel.consume(QUEUES.WALLET_RESPONSES, async (msg) => {
        if (!msg) return;

        try {
          const event: WalletResponseEvent = JSON.parse(msg.content.toString());
          console.log(`Received wallet response event: ${event.eventType} for transaction ${event.transactionId}`);

          await this.handleWalletResponse(event);

          // Acknowledge message
          channel.ack(msg);
        } catch (err) {
          console.error('Error processing message:', err);
          // Reject and requeue for retry
          channel.nack(msg, false, true);
        }
      });

      this.isRunning = true;
      console.log('✓ Transaction Consumer started');
    } catch (err) {
      console.error('Error starting Transaction Consumer:', err);
      throw err;
    }
  }

  private async handleWalletResponse(event: WalletResponseEvent) {
    const { transactionId, eventType } = event;

    if (eventType === 'WalletBalanceUpdated') {
      const e = event as WalletBalanceUpdatedPayload;
      await transactionService.handleWalletResponse(transactionId, {
        success: true,
        walletVersion: e.newVersion,
      });
      console.log(`✓ Transaction ${transactionId} marked as COMPLETED`);
    } else if (eventType === 'WalletBalanceUpdateFailed') {
      const e = event as WalletBalanceUpdateFailedPayload;
      await transactionService.handleWalletResponse(transactionId, {
        success: false,
        error: e.error,
      });
      console.log(`✗ Transaction ${transactionId} marked as FAILED: ${e.error}`);
      await this.triggerSagaCompensation(transactionId, e.error);
    }
  }

  private async triggerSagaCompensation(transactionId: string, reason: string) {
    // Compensation logic: Depending on the failure reason, we may need to:
    // 1. Retry the operation with exponential backoff
    // 2. Alert operations team
    // 3. Store in a Dead Letter Queue for manual review
    // 4. Reverse related operations if transaction was partially completed

    console.log(
      `⚠ SAGA Compensation triggered for transaction ${transactionId}. Reason: ${reason}`
    );

    // Store compensation request for later processing by a background job
    // For now, just log the event
    // In production, this would queue the compensation task
  }

  async stop() {
    this.isRunning = false;
    console.log('✓ Transaction Consumer stopped');
  }
}

export default new TransactionConsumer();
