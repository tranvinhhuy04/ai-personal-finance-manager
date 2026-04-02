/**
 * Strongly-typed event payload interfaces for the transaction service message bus.
 */

export interface TransactionCreatedPayload {
  transactionId: string;
  walletId: string;
  userId?: string;
  amount: string;
  transactionType: 'INCOME' | 'EXPENSE';
  currency: string;
  description: string;
  occurredAt: string;
  source?: 'MANUAL' | 'INVOICE_CONFIRMATION';
}

export interface OutboxEventEnvelope<P = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: 'TRANSACTION';
  payload: P;
  createdAt: string;
}

export type TransactionCreatedEnvelope = OutboxEventEnvelope<TransactionCreatedPayload>;

export interface WalletBalanceUpdatedPayload {
  eventType: 'WalletBalanceUpdated';
  transactionId: string;
  walletId?: string;
  newBalance?: string;
  newVersion?: number;
  timestamp?: string;
}

export interface WalletBalanceUpdateFailedPayload {
  eventType: 'WalletBalanceUpdateFailed';
  transactionId: string;
  walletId?: string;
  error: string;
  timestamp?: string;
}

export type WalletResponseEvent = WalletBalanceUpdatedPayload | WalletBalanceUpdateFailedPayload;
