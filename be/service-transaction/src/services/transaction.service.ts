import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { OutboxModel } from '../models/outbox.model';
import { TransactionModel } from '../models/transaction.model';

export type CreateTransactionInput = {
  wallet_id: string;
  amount: string;
  transaction_type: 'INCOME' | 'EXPENSE';
  idempotency_key: string;
};

function parsePositiveAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('amount must be a positive number', 400);
  }
  return amount;
}

class TransactionService {
  async createTransaction(input: CreateTransactionInput) {
    if (!input.wallet_id) throw new AppError('wallet_id is required', 400);
    if (!input.transaction_type) throw new AppError('transaction_type is required', 400);
    if (!input.idempotency_key) throw new AppError('idempotency_key is required', 400);

    const amount = parsePositiveAmount(input.amount);

    try {
      const transaction = await TransactionModel.create({
        wallet_id: input.wallet_id,
        amount: mongoose.Types.Decimal128.fromString(String(amount)),
        transaction_type: input.transaction_type,
        status: 'PENDING',
        idempotency_key: input.idempotency_key,
      });

      await OutboxModel.create({
        event_type: 'TransactionCreated',
        aggregate_id: transaction._id.toString(),
        payload: {
          transactionId: transaction._id.toString(),
          walletId: transaction.wallet_id,
          amount: String(amount),
          transactionType: transaction.transaction_type,
        },
        published: false,
      });

      return this.toResponse(transaction);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('idempotency_key already exists', 409);
      }
      throw error;
    }
  }

  async markCompleted(transactionId: string) {
    await TransactionModel.findByIdAndUpdate(transactionId, { status: 'COMPLETED' });
  }

  async markFailed(transactionId: string) {
    await TransactionModel.findByIdAndUpdate(transactionId, { status: 'FAILED' });
  }

  async listTransactions(limit = 50, skip = 0, walletId?: string) {
    const filter = walletId ? { wallet_id: walletId } : {};

    const items = await TransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .skip(skip)
      .lean();

    return items.map((item) => this.toResponse(item));
  }

  private toResponse(transaction: any) {
    return {
      id: transaction._id.toString(),
      wallet_id: transaction.wallet_id,
      amount: transaction.amount?.toString?.() ?? '0',
      transaction_type: transaction.transaction_type,
      status: transaction.status,
      idempotency_key: transaction.idempotency_key,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}

export const transactionService = new TransactionService();
