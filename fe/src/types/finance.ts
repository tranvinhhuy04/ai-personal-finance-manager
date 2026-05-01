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
export type TransactionSource = 'MANUAL' | 'INVOICE_CONFIRMATION' | 'RECURRING' | 'SAVING';

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
  source?: TransactionSource;
  idempotencyKey: string;
  createdAt: string;
}

export type SavingProductType = 'SAVING' | 'INVESTMENT';
export type SavingStatus = 'ACTIVE' | 'SETTLED';
export type SettleSavingType = 'FULL' | 'PARTIAL';

export interface SavingPackage {
  id: string;
  userId: string;
  name: string;
  type: SavingProductType;
  targetAmount: number | null;
  currentAmount: number;
  startDate: string;
  endDate: string | null;
  status: SavingStatus;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY';
export type RecurringRuleStatus = 'ACTIVE' | 'PAUSED';

export interface RecurringRule {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string | null;
  transactionType: TransactionDirection;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  status: RecurringRuleStatus;
  note: string;
  lastRunOn?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface AnalyticsComparisonPoint {
  label: string;
  income: number;
  expense: number;
}

export interface AnalyticsBudgetProgressItem {
  category: string;
  spent: number;
  limit: number;
  remaining: number;
  percent: number;
}

export interface AnalyticsForecastPoint {
  label: string;
  actual?: number;
  forecast?: number;
}

export interface AnalyticsTopTransaction {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  transactionType: TransactionDirection;
  source?: string;
}

export interface AnalyticsSubscriptionItem {
  id: string;
  name: string;
  date: string;
  amount: number;
  frequency: RecurringFrequency;
  status: RecurringRuleStatus;
}

export interface AnalyticsInsight {
  severity: 'good' | 'warning' | 'neutral';
  headline: string;
  message: string;
  recommendation: string;
  spendingChangePercent: number;
  incomeChangePercent: number;
  savingsRate: number;
  dailyAverageExpense: number;
  riskiestCategory: string | null;
}

export interface AnalyticsDashboardResponse {
  currentMonth: string;
  filters: {
    month: string | null;
    walletId: string | null;
    range?: string | null;
    from?: string | null;
    to?: string | null;
  };
  period?: {
    range: string;
    label: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    netCashFlow?: number;
  };
  kpis?: {
    savingsRate: number;
    dailyAverageExpense: number;
    recurringSpend: number;
    transactionCount: number;
  };
  insights?: AnalyticsInsight;
  trend: AnalyticsTrendPoint[];
  breakdown: AnalyticsCategoryBreakdown[];
  comparison?: AnalyticsComparisonPoint[];
  budgetProgress?: AnalyticsBudgetProgressItem[];
  forecast?: AnalyticsForecastPoint[];
  topTransactions?: AnalyticsTopTransaction[];
  subscriptions?: AnalyticsSubscriptionItem[];
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
  balance?: string;
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

export interface CreateSavingInput {
  name: string;
  type: SavingProductType;
  targetAmount?: number | string | null;
  startDate?: string;
  endDate?: string | null;
}

export interface DepositSavingInput {
  sourceWalletId: string;
  amount: number | string;
}

export interface SettleSavingInput {
  settleType?: SettleSavingType;
  destinationWalletId?: string | null;
  amount?: number | string | null;
}

export interface CreateRecurringRuleInput {
  walletId: string;
  categoryId: string | null;
  transactionType: TransactionDirection;
  amount: number | string;
  currency?: string;
  frequency: RecurringFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  status?: RecurringRuleStatus;
  note?: string;
}

export interface UpdateRecurringRuleInput extends Partial<CreateRecurringRuleInput> {}

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

// ─── AI / OCR ────────────────────────────────────────────────────────────────

export interface InvoiceExtractedData {
  merchantName: string;
  totalAmount: number | null;
  transactionDate: string | null;
}

export interface AIOcrResponse {
  success: boolean;
  data: InvoiceExtractedData;
}

export interface AIChatRequest {
  question: string;
  context?: Record<string, unknown>;
  useLlm?: boolean;
  month?: string;
  walletId?: string;
  range?: 'month' | 'quarter' | 'year' | 'custom' | string;
  from?: string;
  to?: string;
}

export interface AIChatResponse {
  success: boolean;
  question: string;
  intent: string;
  confidence: number;
  scores: Record<string, number>;
  answer: string;
  llmUsed: boolean;
  queryPlan: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export type ExtractedTransactionType = 'expense' | 'income';

export interface ExtractedTransactionDraft {
  title: string;
  amount: number;
  type: ExtractedTransactionType;
  category: string;
}

export interface AIExtractTextResponse {
  success: boolean;
  input: string;
  rawOutput: string;
  model: string;
}
