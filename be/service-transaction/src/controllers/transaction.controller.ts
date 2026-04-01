import { Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { outboxPublisher } from '../messaging/outbox.publisher';
import { catchAsync } from '../middlewares/catchAsync';

export const createTransaction = catchAsync(async (req: Request, res: Response) => {
  const { wallet_id, amount, transaction_type, idempotency_key } = req.body ?? {};

  const transaction = await transactionService.createTransaction({
    wallet_id,
    amount,
    transaction_type,
    idempotency_key,
  });

  // Publish asynchronously right after persisting outbox; response is not blocked by wallet processing.
  outboxPublisher.publishPending().catch((error) => {
    console.error('[outbox] publishPending failed:', error);
  });

  return res.status(201).json(transaction);
});

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
  const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
  const skip = Number.parseInt(String(req.query.skip ?? '0'), 10);
  const walletId = req.query.wallet_id ? String(req.query.wallet_id) : undefined;

  const data = await transactionService.listTransactions(
    Number.isNaN(limit) ? 50 : limit,
    Number.isNaN(skip) ? 0 : skip,
    walletId
  );

  return res.status(200).json(data);
});
