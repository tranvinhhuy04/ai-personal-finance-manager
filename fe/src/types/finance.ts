/**
 * Canonical data types for the Finance application.
 * Single source of truth for wallets, categories, transactions, and invoices.
 */

// ─── Wallet ───────────────────────────────────────────────────────────────────

export type WalletType = 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';

export interface Wallet {
  id: string;
  userId: string;
  walletType: WalletType;
  walletName: string;
  balance: string;
  spendingLimit: string | null;
  status: 0 | 1 | 2;
  version: number;
  createdAt: string;
  updatedAt: string;
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
  status: 0 | 1;
  createdAt: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface Transaction {
  id: string;
  walletId: string;
  userId: string;
  categoryId: string;
  transactionType: TransactionDirection;
  amount: string;
  currency: string;
  status: TransactionStatus;
  description?: string;
  occurredAt: string;
  source?: 'MANUAL' | 'INVOICE_CONFIRMATION';
  idempotencyKey: string;
  createdAt: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsTrendPoint {
  monthKey: string;
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface AnalyticsCategoryBreakdown {
  categoryId: string;
  name: string;
  value: number;
  color?: string | null;
  transactionCount?: number;
}

export interface AnalyticsDashboardResponse {
  currentMonth: string;
  filters: {
    month: string | null;
    walletId: string | null;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    netCashFlow?: number;
  };
  trend: AnalyticsTrendPoint[];
  breakdown: AnalyticsCategoryBreakdown[];
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'PENDING' | 'PROCESSED' | 'REJECTED' | 'DELETED';

export interface InvoiceAuditTrailEntry {
  action: string;
  changedBy: string;
  timestamp: string;
  previousState: Record<string, unknown>;
  nextState?: Record<string, unknown>;
  note?: string | null;
}

export interface Invoice {
  id: string;
  userId: string;
  imageUrl: string;
  extractedData: Record<string, unknown>;
  status: InvoiceStatus;
  transactionId: string | null;
  auditTrail: InvoiceAuditTrailEntry[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Create/Update Inputs ─────────────────────────────────────────────────

export interface CreateWalletInput {
  walletType: WalletType;
  walletName: string;
  spendingLimit?: string;
}

export interface CreateTransactionInput {
  walletId: string;
  categoryId: string;
  transactionType: TransactionDirection;
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

export interface UpdateInvoiceInput {
  imageUrl?: string;
  extractedData?: Record<string, unknown>;
  status?: Exclude<InvoiceStatus, 'DELETED'>;
}

export interface ConfirmInvoiceInput {
  walletId: string;
  categoryId: string;
  amount: string;
  transactionType?: TransactionDirection;
  currency?: string;
  description?: string;
  occurredAt?: string;
  extractedData?: Record<string, unknown>;
}
