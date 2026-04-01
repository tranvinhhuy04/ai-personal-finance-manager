export type WalletBalanceUpdatedEvent = {
  eventType: 'WalletBalanceUpdated';
  userId: string;
  walletId: string;
  walletName?: string;
  newBalance: number;
  spendingLimit?: number | null;
  transactionId?: string;
  timestamp?: string;
};
