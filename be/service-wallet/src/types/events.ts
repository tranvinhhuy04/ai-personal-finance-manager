/**
 * Strongly-typed event payload interfaces for SAGA message bus.
 *
 * Convention:
 *   - Events CONSUMED by Wallet Service  → TransactionCreatedPayload
 *   - Events PUBLISHED by Wallet Service → WalletBalanceUpdatedPayload, WalletBalanceUpdateFailedPayload
 */

// ─── Consumed by Wallet Service ───────────────────────────────────────────────

export interface TransactionCreatedPayload {
  transactionId: string;
  walletId: string;
  userId: string;
  /** Always positive; Wallet Service applies sign based on transactionType */
  amount: string;
  transactionType: 'INCOME' | 'EXPENSE';
  currency: string;
  description: string;
  occurredAt: string; // ISO-8601
}

/** Full RabbitMQ message envelope published from Transaction Service's Outbox */
export interface TransactionCreatedEnvelope {
  eventId: string;
  eventType: 'TransactionCreated';
  aggregateId: string;
  aggregateType: 'TRANSACTION';
  payload: TransactionCreatedPayload;
  createdAt: string; // ISO-8601
}

// ─── Published by Wallet Service ─────────────────────────────────────────────

export interface WalletBalanceUpdatedPayload {
  eventType: 'WalletBalanceUpdated';
  transactionId: string;
  walletId: string;
  newBalance: string;
  newVersion: number;
  timestamp: string; // ISO-8601
}

export interface WalletBalanceUpdateFailedPayload {
  eventType: 'WalletBalanceUpdateFailed';
  transactionId: string;
  walletId: string;
  error: string;
  timestamp: string; // ISO-8601
}
