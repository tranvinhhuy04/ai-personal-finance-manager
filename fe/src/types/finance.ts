/**
 * Canonical data types for the Finance application.
 * Single source of truth — matches the exact shapes returned by:
 *   - service-wallet  (balance / spendingLimit are MongoDB Decimal128, serialized as string)
 *   - service-transaction (amount is MongoDB Decimal128, serialized as string)
 *
 * Import from here in both apiClient.ts and the Zustand stores.
 */

// ─── Wallet ───────────────────────────────────────────────────────────────────

export type WalletType = 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';

export interface Wallet {
  id: string;
  userId: string;
  walletType: WalletType;
  walletName: string;
  /** Positive decimal string, e.g. "150000000" */
  balance: string;
  /** Positive decimal string or null when no limit is set */
  spendingLimit: string | null;
  /** 1 = Active · 0 = Inactive · 2 = Blocked */
  status: 0 | 1 | 2;
  /** Optimistic-lock version counter */
  version: number;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ─── Category ─────────────────────────────────────────────────────────────────

export type TransactionDirection = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  userId: string;
  name: string;
  categoryType: TransactionDirection;
  parentId: string | null;
  isSystem: boolean;
  /** 1 = Active · 0 = Inactive */
  status: 0 | 1;
  createdAt: string; // ISO-8601
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface Transaction {
  id: string;
  walletId: string;
  userId: string;
  categoryId: string;
  transactionType: TransactionDirection;
  /** Positive decimal string, e.g. "500000" */
  amount: string;
  currency: string;
  status: TransactionStatus;
  description?: string;
  occurredAt: string; // ISO-8601
  idempotencyKey: string;
  createdAt: string; // ISO-8601
}

// ─── API Create/Update Inputs ─────────────────────────────────────────────────

export interface CreateWalletInput {
  walletType: WalletType;
  walletName: string;
  /** Optional — pass as string; backend expects a decimal string */
  spendingLimit?: string;
}

export interface CreateTransactionInput {
  walletId: string;
  categoryId: string;
  transactionType: TransactionDirection;
  /** Positive decimal string */
  amount: string;
  currency?: string;
  description?: string;
  occurredAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  categoryType: TransactionDirection;
  parentId?: string | null;
}
