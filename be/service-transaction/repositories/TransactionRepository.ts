import Category, { ICategory } from '../src/models/Category';
import Transaction, { ITransaction } from '../src/models/Transaction';
import OutboxEvent, { IOutboxEvent } from '../src/models/Outbox';
import mongoose from 'mongoose';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCategoryInput {
  userId: string;
  name: string;
  categoryType: 'INCOME' | 'EXPENSE';
  parentId?: string | null;
}

export interface CreateTransactionInput {
  walletId: string;
  userId: string;
  categoryId: string;
  transactionType: 'INCOME' | 'EXPENSE';
  amount: Decimal;
  currency?: string;
  description?: string;
  occurredAt: Date;
}

export class CategoryRepository {
  async createCategory(input: CreateCategoryInput): Promise<ICategory> {
    const category = new Category({
      userId: input.userId,
      name: input.name,
      categoryType: input.categoryType,
      parentId: input.parentId || null,
      isSystem: false,
      status: 1,
    });

    return await category.save();
  }

  async findCategoryById(categoryId: string): Promise<ICategory | null> {
    return await Category.findById(categoryId).lean();
  }

  async findCategoriesByUserId(userId: string, categoryType?: string): Promise<ICategory[]> {
    const query: any = { userId, status: 1 };
    if (categoryType) {
      query.categoryType = categoryType;
    }
    return await Category.find(query).lean();
  }

  async updateCategoryStatus(categoryId: string, status: number): Promise<ICategory | null> {
    return await Category.findByIdAndUpdate(categoryId, { status }, { new: true }).lean();
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const result = await Category.deleteOne({ _id: categoryId });
    return result.deletedCount > 0;
  }
}

export class TransactionRepository {
  async createTransaction(input: CreateTransactionInput): Promise<ITransaction> {
    const idempotencyKey = uuidv4();

    const transaction = new Transaction({
      walletId: input.walletId,
      userId: input.userId,
      categoryId: input.categoryId,
      transactionType: input.transactionType,
      amount: input.amount,
      currency: input.currency || 'VND',
      status: 'PENDING',
      description: input.description || null,
      occurredAt: input.occurredAt,
      idempotencyKey,
    });

    return await transaction.save();
  }

  async findTransactionById(transactionId: string): Promise<ITransaction | null> {
    return await Transaction.findById(transactionId).lean();
  }

  async findTransactionByIdempotencyKey(idempotencyKey: string): Promise<ITransaction | null> {
    return await Transaction.findOne({ idempotencyKey }).lean();
  }

  async findTransactionsByUserId(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<ITransaction[]> {
    return await Transaction.find({ userId })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  async findTransactionsByWalletId(
    walletId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<ITransaction[]> {
    return await Transaction.find({ walletId })
      .sort({ occurredAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'
  ): Promise<ITransaction | null> {
    return await Transaction.findByIdAndUpdate(
      transactionId,
      { status },
      { new: true }
    ).lean();
  }
}

export class OutboxRepository {
  async createOutboxEvent(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, any>
  ): Promise<IOutboxEvent> {
    const event = new OutboxEvent({
      eventType,
      aggregateType,
      aggregateId,
      payload,
      published: false,
    });

    return await event.save();
  }

  async findUnpublishedEvents(limit: number = 10): Promise<IOutboxEvent[]> {
    return await OutboxEvent.find({ published: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  }

  async markEventAsPublished(eventId: string): Promise<IOutboxEvent | null> {
    return await OutboxEvent.findByIdAndUpdate(
      eventId,
      { published: true, publishedAt: new Date() },
      { new: true }
    ).lean();
  }

  async deletePublishedEvent(eventId: string): Promise<boolean> {
    const result = await OutboxEvent.deleteOne({ _id: eventId });
    return result.deletedCount > 0;
  }
}

export const categoryRepository = new CategoryRepository();
export const transactionRepository = new TransactionRepository();
export const outboxRepository = new OutboxRepository();
