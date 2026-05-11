import { Request, Response } from 'express';
import { transactionService } from './transaction.service';
import { outboxPublisher } from '../../messaging/outbox.publisher';
import { catchAsync } from '../../middlewares/catchAsync';

export const createTransaction = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const {
    wallet_id,
    category_id,
    amount,
    transaction_type,
    currency,
    description,
    occurred_at,
    idempotency_key,
  } = req.body ?? {};

  const transaction = await transactionService.createTransaction({
    user_id: userId,
    wallet_id,
    category_id,
    amount,
    transaction_type,
    currency,
    description,
    occurred_at,
    idempotency_key,
    source: 'MANUAL',
    authorization: req.headers.authorization,
  });

  outboxPublisher.publishPending().catch((error) => {
    console.error('[outbox] publishPending failed:', error);
  });

  return res.status(201).json(transaction);
});

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
  const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
  const skip = Number.parseInt(String(req.query.skip ?? '0'), 10);
  const walletId = req.query.wallet_id ? String(req.query.wallet_id) : undefined;
  const userId = String((req as any).userId ?? '');

  if (!Number.isNaN(limit) && (limit < 1 || limit > 200)) {
    return res.status(400).json({ message: 'limit must be between 1 and 200' });
  }

  if (!Number.isNaN(skip) && skip < 0) {
    return res.status(400).json({ message: 'skip must be >= 0' });
  }

  const data = await transactionService.listTransactions(
    Number.isNaN(limit) ? 50 : limit,
    Number.isNaN(skip) ? 0 : skip,
    walletId,
    userId,
    req.headers.authorization
  );

  return res.status(200).json(data);
});
