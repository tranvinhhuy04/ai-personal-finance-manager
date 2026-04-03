export type WalletBalanceUpdatedEvent = {
  eventType: 'WalletBalanceUpdated';
  userId?: string;
  walletId: string;
  walletName?: string;
  newBalance: number | string;
  transactionId?: string;
  timestamp?: string;
};

export type NotificationRequestedEvent = {
  eventType: 'NotificationRequested';
  payload: {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING';
    metadata?: Record<string, unknown>;
    createdAt?: string;
  };
};
