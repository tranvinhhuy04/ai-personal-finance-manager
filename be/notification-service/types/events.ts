export type WalletBalanceUpdatedEvent = {
  eventType: 'WalletBalanceUpdated';
  userId: string;
  walletId: string;
  walletName?: string;
  newBalance: number;
  transactionId?: string;
  timestamp?: string;
};
