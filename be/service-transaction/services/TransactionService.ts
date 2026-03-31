import {
  categoryRepository,
  transactionRepository,
  outboxRepository,
} from '../repositories/TransactionRepository';
import { ITransaction } from '../src/models/Transaction';
import Decimal from 'decimal.js';

function validationError(message: string) {
  const err: any = new Error(message);
  err.code = 'VALIDATION_ERROR';
  return err;
}

function notFoundError(message: string) {
  const err: any = new Error(message);
  err.code = 'NOT_FOUND';
  return err;
}

function businessError(message: string) {
  const err: any = new Error(message);
  err.code = 'BUSINESS_ERROR';
  return err;
}

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
  amount: string;
  currency?: string;
  description?: string;
  occurredAt?: Date;
}

export class TransactionService {
  /**
   * Create a category for grouping transactions
   */
  async createCategory(input: CreateCategoryInput) {
    if (!input.userId) throw validationError('userId is required');
    if (!input.name) throw validationError('name is required');
    if (!input.categoryType) throw validationError('categoryType is required');

    const category = await categoryRepository.createCategory(input);
    return this.toSafeCategory(category);
  }

  /**
   * Get user's categories
   */
  async getCategoriesByUserId(userId: string) {
    const categories = await categoryRepository.findCategoriesByUserId(userId);
    return categories.map((c) => this.toSafeCategory(c));
  }

  /**
   * Create a transaction with PENDING status and emit Outbox event.
   * The Outbox event will be published to RabbitMQ by a separate publisher.
   */
  async createTransaction(input: CreateTransactionInput) {
    // Validation
    if (!input.walletId) throw validationError('walletId is required');
    if (!input.userId) throw validationError('userId is required');
    if (!input.categoryId) throw validationError('categoryId is required');
    if (!input.transactionType) throw validationError('transactionType is required');
    if (!input.amount) throw validationError('amount is required');

    const amount = new Decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw validationError('amount must be greater than 0');
    }

    // Verify category exists
    const category = await categoryRepository.findCategoryById(input.categoryId);
    if (!category) throw notFoundError('Category not found');
    if (category.userId !== input.userId) throw validationError('Unauthorized');

    // Create transaction in PENDING status
    const transaction = await transactionRepository.createTransaction({
      walletId: input.walletId,
      userId: input.userId,
      categoryId: input.categoryId,
      transactionType: input.transactionType,
      amount,
      currency: input.currency || 'VND',
      description: input.description,
      occurredAt: input.occurredAt || new Date(),
    });

    // Create Outbox event for SAGA: TransactionCreated
    // The amount direction depends on transaction type
    const eventPayload = {
      transactionId: transaction._id.toString(),
      walletId: input.walletId,
      userId: input.userId,
      amount: amount.toString(), // Always positive; wallet service will apply direction
      transactionType: input.transactionType, // INCOME or EXPENSE
      currency: input.currency || 'VND',
      description: input.description || '',
      occurredAt: transaction.occurredAt,
    };

    await outboxRepository.createOutboxEvent(
      'TransactionCreated',
      'TRANSACTION',
      transaction._id.toString(),
      eventPayload
    );

    return this.toSafeTransaction(transaction);
  }

  /**
   * Handle response from Wallet Service:
   * - If WalletBalanceUpdated: Mark transaction as COMPLETED
   * - If WalletBalanceUpdateFailed: Mark transaction as FAILED and trigger SAGA compensation
   */
  async handleWalletResponse(
    transactionId: string,
    walletResponse: {
      success: boolean;
      error?: string;
      walletVersion?: number;
    }
  ) {
    const transaction = await transactionRepository.findTransactionById(transactionId);
    if (!transaction) throw notFoundError('Transaction not found');

    if (walletResponse.success) {
      // Wallet balance updated successfully
      return await transactionRepository.updateTransactionStatus(transactionId, 'COMPLETED');
    } else {
      // Wallet balance update failed
      // Mark transaction as FAILED
      const failed = await transactionRepository.updateTransactionStatus(
        transactionId,
        'FAILED'
      );

      // TODO: Trigger SAGA compensation if needed
      // For now, just emit a CompensationNeeded event if the transaction was partially processed

      return failed;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string) {
    const transaction = await transactionRepository.findTransactionById(transactionId);
    if (!transaction) throw notFoundError('Transaction not found');
    return this.toSafeTransaction(transaction);
  }

  /**
   * Get user's transactions with pagination
   */
  async getTransactionsByUserId(userId: string, limit: number = 50, skip: number = 0) {
    const transactions = await transactionRepository.findTransactionsByUserId(userId, limit, skip);
    return transactions.map((t) => this.toSafeTransaction(t));
  }

  /**
   * Get transactions by wallet with pagination
   */
  async getTransactionsByWalletId(walletId: string, limit: number = 50, skip: number = 0) {
    const transactions = await transactionRepository.findTransactionsByWalletId(
      walletId,
      limit,
      skip
    );
    return transactions.map((t) => this.toSafeTransaction(t));
  }

  // Helper methods
  private toSafeCategory(category: any) {
    return {
      id: category._id.toString(),
      userId: category.userId,
      name: category.name,
      categoryType: category.categoryType,
      parentId: category.parentId || null,
      isSystem: category.isSystem,
      status: category.status,
      createdAt: category.createdAt,
    };
  }

  private toSafeTransaction(transaction: ITransaction) {
    return {
      id: transaction._id.toString(),
      walletId: transaction.walletId,
      userId: transaction.userId,
      categoryId: transaction.categoryId,
      transactionType: transaction.transactionType,
      amount: transaction.amount.toString(), // Types.Decimal128 has toString()
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      occurredAt: transaction.occurredAt,
      idempotencyKey: transaction.idempotencyKey,
      createdAt: transaction.createdAt,
    };
  }
}

export default new TransactionService();
