// consumed by wallet service
export interface TransactionCreatedPayload {
  transactionId: string;
  walletId: string;
  userId: string;
  amount: string;
  transactionType: 'INCOME' | 'EXPENSE';
  currency: string;
  description: string;
  occurredAt: string;
}

export interface TransactionCreatedEnvelope {
  eventId: string;
  eventType: 'TransactionCreated';
  aggregateId: string;
  aggregateType: 'TRANSACTION';
  payload: TransactionCreatedPayload;
  createdAt: string;
}

// published by wallet service
export interface WalletBalanceUpdatedPayload {
  eventType: 'WalletBalanceUpdated';
  transactionId: string;
  walletId: string;
  newBalance: string;
  newVersion: number;
  timestamp: string;
}

export interface WalletBalanceUpdateFailedPayload {
  eventType: 'WalletBalanceUpdateFailed';
  transactionId: string;
  walletId: string;
  error: string;
  timestamp: string;
}
