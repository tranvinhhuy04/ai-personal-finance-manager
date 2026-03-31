/**
 * Strongly-typed event payload interfaces for SAGA message bus.
 *
 * Convention:
 *   - Events PUBLISHED by Transaction Service  → TransactionCreatedPayload
 *   - Events CONSUMED by Transaction Service   → WalletBalanceUpdatedPayload, WalletBalanceUpdateFailedPayload
 */

// ─── Published by Transaction Service ────────────────────────────────────────

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

/** Envelope written to the Outbox collection and published to RabbitMQ */
export interface OutboxEventEnvelope<P = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: 'TRANSACTION';
  payload: P;
  createdAt: string; // ISO-8601
}

export type TransactionCreatedEnvelope = OutboxEventEnvelope<TransactionCreatedPayload>;

// ─── Consumed by Transaction Service ─────────────────────────────────────────

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

export type WalletResponseEvent = WalletBalanceUpdatedPayload | WalletBalanceUpdateFailedPayload;
