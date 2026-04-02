import mongoose from 'mongoose';
import CategoryModel, { ICategory } from '../models/category.model';
import { OutboxModel, IOutboxEvent } from '../models/outbox.model';
import { TransactionModel, ITransaction } from '../models/transaction.model';

export class CategoryRepository {
  async findById(categoryId: string) {
    return CategoryModel.findById(categoryId).lean<ICategory | null>();
  }

  async findByUserId(userId: string, categoryType?: 'INCOME' | 'EXPENSE') {
    const filter: Record<string, unknown> = { userId, status: 1 };
    if (categoryType) {
      filter.categoryType = categoryType;
    }
    return CategoryModel.find(filter).sort({ name: 1 }).lean<ICategory[]>();
  }
}

export type CreateTransactionRecordInput = {
  user_id?: string;
  wallet_id: string;
  category_id?: string | null;
  amount: string;
  transaction_type: 'INCOME' | 'EXPENSE';
  currency?: string;
  description?: string;
  occurred_at?: Date;
  source?: 'MANUAL' | 'INVOICE_CONFIRMATION';
  idempotency_key: string;
  session?: mongoose.ClientSession;
};

export class TransactionRepository {
  async create(input: CreateTransactionRecordInput) {
    const [transaction] = await TransactionModel.create(
      [
        {
          user_id: input.user_id ?? null,
          wallet_id: input.wallet_id,
          category_id: input.category_id ?? null,
          amount: mongoose.Types.Decimal128.fromString(String(input.amount)),
          transaction_type: input.transaction_type,
          currency: input.currency ?? 'VND',
          description: input.description ?? null,
          occurred_at: input.occurred_at ?? new Date(),
          source: input.source ?? 'MANUAL',
          idempotency_key: input.idempotency_key,
          status: 'PENDING',
        },
      ],
      input.session ? { session: input.session } : {}
    );

    return transaction;
  }

  async findById(transactionId: string) {
    return TransactionModel.findById(transactionId).lean<ITransaction | null>();
  }

  async findMany(filter: Record<string, unknown>, limit = 50, skip = 0) {
    return TransactionModel.find(filter)
      .sort({ occurred_at: -1, createdAt: -1 })
      .limit(Math.min(limit, 200))
      .skip(skip)
      .lean<ITransaction[]>();
  }

  async updateStatus(transactionId: string, status: ITransaction['status']) {
    return TransactionModel.findByIdAndUpdate(transactionId, { status }, { new: true }).lean<ITransaction | null>();
  }
}

export class OutboxRepository {
  async createTransactionCreatedEvent(
    aggregateId: string,
    payload: Record<string, unknown>,
    session?: mongoose.ClientSession
  ) {
    const [event] = await OutboxModel.create(
      [
        {
          event_type: 'TransactionCreated',
          aggregate_id: aggregateId,
          payload,
          published: false,
        },
      ],
      session ? { session } : {}
    );

    return event;
  }

  async findUnpublished(limit = 20) {
    return OutboxModel.find({ published: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean<IOutboxEvent[]>();
  }
}

export const categoryRepository = new CategoryRepository();
export const transactionRepository = new TransactionRepository();
export const outboxRepository = new OutboxRepository();
