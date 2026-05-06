export type WalletType = 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';
export type TimeRange = 'month' | 'quarter' | 'year';

export interface Wallet {
  id: string;
  userId: string;
  walletType: WalletType;
  walletName: string;
  balance: string;
  status: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavingPackage {
  id: string;
  userId: string;
  name: string;
  type: 'SAVING' | 'INVESTMENT';
  targetAmount: number | null;
  currentAmount: number;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsDashboardResponse {
  currentMonth?: string;
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
    netCashFlow: number;
  };
  kpis?: {
    savingsRate: number;
    dailyAverageExpense: number;
    recurringSpend: number;
    transactionCount: number;
  };
  insights?: {
    severity: 'good' | 'warning' | 'neutral';
    headline: string;
    message: string;
    recommendation: string;
    spendingChangePercent: number;
    incomeChangePercent: number;
    savingsRate: number;
    dailyAverageExpense: number;
    riskiestCategory: string | null;
  };
  trend: Array<{
    monthKey: string;
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  breakdown: Array<{
    categoryId: string;
    name: string;
    value: number;
    color?: string | null;
    transactionCount?: number;
  }>;
  comparison: Array<{
    label: string;
    income: number;
    expense: number;
  }>;
  budgetProgress?: Array<{
    category: string;
    spent: number;
    limit: number;
    remaining: number;
    percent: number;
  }>;
  forecast?: Array<{
    label: string;
    actual?: number;
    forecast?: number;
  }>;
  topTransactions?: Array<{
    id: string;
    merchant: string;
    category: string;
    date: string;
    amount: number;
    transactionType: 'INCOME' | 'EXPENSE';
  }>;
}

export interface AIChatRequest {
  question: string;
  useLlm?: boolean;
  month?: string;
  walletId?: string;
  range?: string;
  from?: string;
  to?: string;
  context?: Record<string, unknown>;
}

export interface AIChatResponse {
  success: boolean;
  question: string;
  intent: string;
  confidence: number;
  scores: Record<string, number>;
  answer: string;
  llmUsed: boolean;
  queryPlan?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface CreateWalletInput {
  walletType: WalletType;
  walletName: string;
  balance?: number;
}
