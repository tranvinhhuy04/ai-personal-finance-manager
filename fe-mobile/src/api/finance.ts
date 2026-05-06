import { aiAxiosClient, axiosClient } from './axiosClient';
import type {
  AIChatRequest,
  AIChatResponse,
  AnalyticsDashboardResponse,
  CreateWalletInput,
  SavingPackage,
  Wallet,
} from '../types/finance';

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class FinanceApiClient {
  private normalizeWallet(raw: Record<string, any>): Wallet {
    return {
      id: String(raw.id ?? raw._id ?? ''),
      userId: String(raw.userId ?? raw.user_id ?? ''),
      walletType: (raw.walletType ?? raw.wallet_type ?? 'CASH') as Wallet['walletType'],
      walletName: String(raw.walletName ?? raw.wallet_name ?? 'Wallet'),
      balance: String(raw.balance ?? '0'),
      status: Number(raw.status ?? 1),
      version: Number(raw.version ?? 0),
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    };
  }

  private normalizeSaving(raw: Record<string, any>): SavingPackage {
    return {
      id: String(raw.id ?? raw._id ?? ''),
      userId: String(raw.userId ?? raw.user_id ?? ''),
      name: String(raw.name ?? 'Gói tiết kiệm'),
      type: (raw.type ?? 'SAVING') as SavingPackage['type'],
      targetAmount: raw.targetAmount ?? raw.target_amount ?? null,
      currentAmount: toNumber(raw.currentAmount ?? raw.current_amount ?? 0),
      startDate: String(raw.startDate ?? raw.start_date ?? new Date().toISOString()),
      endDate: raw.endDate ?? raw.end_date ?? null,
      status: (raw.status ?? 'ACTIVE') as SavingPackage['status'],
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    };
  }

  private normalizeAnalytics(raw: Record<string, any>): AnalyticsDashboardResponse {
    const summary = raw.summary ?? {};
    const kpis = raw.kpis ?? {};
    const insights = raw.insights ?? {};

    return {
      currentMonth: String(raw.currentMonth ?? ''),
      period: raw.period
        ? {
            range: String(raw.period.range ?? 'month'),
            label: String(raw.period.label ?? ''),
            startDate: String(raw.period.startDate ?? ''),
            endDate: String(raw.period.endDate ?? ''),
          }
        : undefined,
      summary: {
        totalIncome: toNumber(summary.totalIncome),
        totalExpense: toNumber(summary.totalExpense),
        net: toNumber(summary.net ?? summary.netCashFlow),
        netCashFlow: toNumber(summary.netCashFlow ?? summary.net),
      },
      kpis: {
        savingsRate: toNumber(kpis.savingsRate),
        dailyAverageExpense: toNumber(kpis.dailyAverageExpense),
        recurringSpend: toNumber(kpis.recurringSpend),
        transactionCount: toNumber(kpis.transactionCount),
      },
      insights: {
        severity: (insights.severity ?? 'neutral') as 'good' | 'warning' | 'neutral',
        headline: String(insights.headline ?? ''),
        message: String(insights.message ?? ''),
        recommendation: String(insights.recommendation ?? ''),
        spendingChangePercent: toNumber(insights.spendingChangePercent),
        incomeChangePercent: toNumber(insights.incomeChangePercent),
        savingsRate: toNumber(insights.savingsRate),
        dailyAverageExpense: toNumber(insights.dailyAverageExpense),
        riskiestCategory: insights.riskiestCategory ? String(insights.riskiestCategory) : null,
      },
      trend: Array.isArray(raw.trend)
        ? raw.trend.map((item: Record<string, any>) => ({
            monthKey: String(item.monthKey ?? ''),
            month: String(item.month ?? ''),
            income: toNumber(item.income),
            expense: toNumber(item.expense),
            net: toNumber(item.net ?? item.netCashFlow),
          }))
        : [],
      breakdown: Array.isArray(raw.breakdown)
        ? raw.breakdown.map((item: Record<string, any>) => ({
            categoryId: String(item.categoryId ?? item.category_id ?? ''),
            name: String(item.name ?? item.category_name ?? 'Khác'),
            value: toNumber(item.value ?? item.total_amount),
            color: item.color ?? null,
            transactionCount: toNumber(item.transactionCount ?? item.transaction_count),
          }))
        : [],
      comparison: Array.isArray(raw.comparison)
        ? raw.comparison.map((item: Record<string, any>) => ({
            label: String(item.label ?? ''),
            income: toNumber(item.income),
            expense: toNumber(item.expense),
          }))
        : [],
      budgetProgress: Array.isArray(raw.budgetProgress)
        ? raw.budgetProgress.map((item: Record<string, any>) => ({
            category: String(item.category ?? 'Khác'),
            spent: toNumber(item.spent),
            limit: toNumber(item.limit),
            remaining: toNumber(item.remaining),
            percent: toNumber(item.percent),
          }))
        : [],
      forecast: Array.isArray(raw.forecast)
        ? raw.forecast.map((item: Record<string, any>) => ({
            label: String(item.label ?? ''),
            actual: item.actual == null ? undefined : toNumber(item.actual),
            forecast: item.forecast == null ? undefined : toNumber(item.forecast),
          }))
        : [],
      topTransactions: Array.isArray(raw.topTransactions)
        ? raw.topTransactions.map((item: Record<string, any>) => ({
            id: String(item.id ?? ''),
            merchant: String(item.merchant ?? item.description ?? 'Giao dịch'),
            category: String(item.category ?? 'Khác'),
            date: String(item.date ?? ''),
            amount: toNumber(item.amount),
            transactionType: (item.transactionType ?? 'EXPENSE') as 'INCOME' | 'EXPENSE',
          }))
        : [],
    };
  }

  private normalizeAIResponse(raw: Record<string, any>): AIChatResponse {
    return {
      success: Boolean(raw.success),
      question: String(raw.question ?? ''),
      intent: String(raw.intent ?? 'unknown'),
      confidence: toNumber(raw.confidence),
      scores: Object.fromEntries(
        Object.entries(raw.scores ?? {}).map(([key, value]) => [key, toNumber(value)])
      ),
      answer: String(raw.answer ?? ''),
      llmUsed: Boolean(raw.llmUsed ?? raw.llm_used),
      queryPlan: (raw.queryPlan ?? raw.query_plan ?? {}) as Record<string, unknown>,
      meta: (raw.meta ?? {}) as Record<string, unknown>,
    };
  }

  async getWallets(): Promise<Wallet[]> {
    const response = await axiosClient.get('/api/v1/wallets');
    return (response.data ?? []).map((item: Record<string, any>) => this.normalizeWallet(item));
  }

  async createWallet(data: CreateWalletInput): Promise<Wallet> {
    const response = await axiosClient.post('/api/v1/wallets', {
      wallet_type: data.walletType,
      wallet_name: data.walletName,
      balance: Number(data.balance ?? 0),
    });

    return this.normalizeWallet(response.data ?? {});
  }

  async updateWalletStatus(walletId: string, status: number): Promise<Wallet> {
    const response = await axiosClient.put(`/api/v1/wallets/${walletId}/status`, { status: Number(status) });
    return this.normalizeWallet(response.data ?? {});
  }

  async getSavings(type?: 'SAVING' | 'INVESTMENT'): Promise<SavingPackage[]> {
    const response = await axiosClient.get('/api/v1/savings', {
      params: type ? { type } : undefined,
    });

    return (response.data ?? []).map((item: Record<string, any>) => this.normalizeSaving(item));
  }

  async getAnalyticsDashboard(filters?: {
    walletId?: string;
    type?: 'monthly' | 'yearly' | string;
    range?: string;
    from?: string;
    to?: string;
  }): Promise<AnalyticsDashboardResponse> {
    const params: Record<string, string> = {};

    if (filters?.walletId) params.wallet_id = filters.walletId;
    if (filters?.type) params.type = filters.type;
    if (filters?.range) params.range = filters.range;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;

    const response = await axiosClient.get('/api/v1/analytics/dashboard', { params });
    return this.normalizeAnalytics(response.data ?? {});
  }

  async askAI(data: AIChatRequest): Promise<AIChatResponse> {
    const response = await aiAxiosClient.post('/api/v1/ai/chat', {
      message: data.question,
      question: data.question,
      context: data.context ?? {},
      use_llm: data.useLlm ?? true,
      month: data.month,
      walletId: data.walletId,
      range: data.range,
      from: data.from,
      to: data.to,
    });

    return this.normalizeAIResponse(response.data ?? {});
  }
}

export const financeApi = new FinanceApiClient();
