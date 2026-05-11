import mongoose, { ClientSession } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors/AppError';
import { OutboxModel } from '../models/outbox.model';
import { TransactionModel } from '../models/transaction.model';
import { parsePositiveAmount } from '../utils/parsers';
import { fetchUserWallets } from '../utils/walletUtils';

export type CreateTransactionInput = {
  user_id?: string;
  wallet_id: string;
  category_id?: string | null;
  amount: string;
  transaction_type: 'INCOME' | 'EXPENSE';
  currency?: string;
  description?: string;
  occurred_at?: string | Date;
  idempotency_key?: string;
  source?: 'MANUAL' | 'INVOICE_CONFIRMATION' | 'RECURRING' | 'SAVING';
  authorization?: string;
  session?: ClientSession;
};

function parseOccurredAt(value?: string | Date) {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('occurred_at must be a valid ISO date', 400);
  }
  return date;
}

class TransactionService {
  private async walletBelongsToUser(walletId: string, authorization?: string) {
    if (!authorization) {
      return true;
    }

    const wallets = await fetchUserWallets(authorization);
    return wallets.some((wallet) => wallet.id === walletId);
  }

  async createTransaction(input: CreateTransactionInput) {
    if (!input.wallet_id) throw new AppError('wallet_id is required', 400);
    if (!input.transaction_type) throw new AppError('transaction_type is required', 400);

    const walletOwned = await this.walletBelongsToUser(input.wallet_id, input.authorization);
    if (!walletOwned) {
      throw new AppError('Wallet not found', 404);
    }

    const amount = parsePositiveAmount(input.amount);
    const occurredAt = parseOccurredAt(input.occurred_at);
    const idempotencyKey = input.idempotency_key?.trim() || uuidv4();
    const createOptions = input.session ? { session: input.session } : {};

    try {
      const [transaction] = await TransactionModel.create(
        [
          {
            user_id: input.user_id ?? null,
            wallet_id: input.wallet_id,
            category_id: input.category_id ?? null,
            amount: mongoose.Types.Decimal128.fromString(String(amount)),
            transaction_type: input.transaction_type,
            currency: input.currency ?? 'VND',
            description: input.description?.trim() || null,
            occurred_at: occurredAt,
            source: input.source ?? 'MANUAL',
            status: 'PENDING',
            idempotency_key: idempotencyKey,
          },
        ],
        createOptions
      );

      await OutboxModel.create(
        [
          {
            event_type: 'TransactionCreated',
            aggregate_id: transaction._id.toString(),
            payload: {
              transactionId: transaction._id.toString(),
              userId: transaction.user_id ?? undefined,
              walletId: transaction.wallet_id,
              categoryId: transaction.category_id ?? undefined,
              amount: String(amount),
              currency: transaction.currency ?? 'VND',
              description: transaction.description ?? '',
              transactionType: transaction.transaction_type,
              occurredAt: occurredAt.toISOString(),
              source: transaction.source ?? 'MANUAL',
            },
            published: false,
          },
        ],
        createOptions
      );

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

  async listTransactions(limit = 50, skip = 0, walletId?: string, userId?: string, authorization?: string) {
    const filter: Record<string, unknown> = {};

    if (walletId) {
      const walletOwned = await this.walletBelongsToUser(walletId, authorization);
      if (!walletOwned) {
        return [];
      }
      filter.wallet_id = walletId;
    }

    if (userId) {
      filter.user_id = userId;
    }

    const items = await TransactionModel.find(filter)
      .sort({ occurred_at: -1, createdAt: -1 })
      .limit(Math.min(limit, 200))
      .skip(skip)
      .lean();

    return items.map((item) => this.toResponse(item));
  }

  private toResponse(transaction: any) {
    return {
      id: transaction._id.toString(),
      user_id: transaction.user_id ?? '',
      wallet_id: transaction.wallet_id,
      category_id: transaction.category_id ?? '',
      amount: transaction.amount?.toString?.() ?? '0',
      transaction_type: transaction.transaction_type,
      currency: transaction.currency ?? 'VND',
      description: transaction.description ?? '',
      status: transaction.status,
      occurredAt: transaction.occurred_at ?? transaction.createdAt,
      source: transaction.source ?? 'MANUAL',
      idempotency_key: transaction.idempotency_key,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}

export const transactionService = new TransactionService();
