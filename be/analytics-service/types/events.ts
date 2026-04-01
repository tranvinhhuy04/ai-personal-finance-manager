export type TransactionEvent = {
  eventType: 'TransactionCreated' | 'TransactionCompleted';
  payload: {
    transactionId: string;
    userId: string;
    walletId: string;
    walletName?: string;
    categoryId: string;
    categoryName?: string;
    transactionType: 'INCOME' | 'EXPENSE';
    amount: string;
    occurredAt?: string;
  };
};
