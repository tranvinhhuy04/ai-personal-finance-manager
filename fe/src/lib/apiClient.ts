import type {
  Wallet,
  Category,
  Transaction,
  Invoice,
  CreateWalletInput,
  CreateTransactionInput,
  CreateCategoryInput,
  UpdateInvoiceInput,
  ConfirmInvoiceInput,
  AnalyticsDashboardResponse,
  RecurringRule,
  CreateRecurringRuleInput,
  UpdateRecurringRuleInput,
  SavingPackage,
  CreateSavingInput,
  DepositSavingInput,
  SettleSavingInput,
  AIOcrResponse,
  AIChatRequest,
  AIChatResponse,
  AIExtractTextResponse,
} from '@/types/finance';
import { aiAxiosClient, axiosClient } from '@/utils/axiosClient';

type WalletApiResponse = Record<string, any>;
type TransactionApiResponse = Record<string, any>;
type CategoryApiResponse = Record<string, any>;
type InvoiceApiResponse = Record<string, any>;
type AnalyticsApiResponse = Record<string, any>;
type RecurringRuleApiResponse = Record<string, any>;
type SavingApiResponse = Record<string, any>;
type AIOcrApiResponse = Record<string, any>;
type AIChatApiResponse = Record<string, any>;
type AIExtractTextApiResponse = Record<string, any>;

class ApiClient {
  private normalizeWallet(raw: WalletApiResponse): Wallet {
    return {
      id: raw.id,
      userId: raw.userId ?? raw.user_id ?? '',
      walletType: raw.walletType ?? raw.wallet_type,
      walletName: raw.walletName ?? raw.wallet_name ?? raw.walletType ?? raw.wallet_type ?? 'Wallet',
      balance: String(raw.balance ?? '0'),
      status: raw.status ?? 1,
      version: raw.version ?? 0,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    } as Wallet;
  }

  private normalizeTransaction(raw: TransactionApiResponse): Transaction {
    return {
      id: raw.id,
      walletId: raw.walletId ?? raw.wallet_id,
      userId: raw.userId ?? raw.user_id ?? '',
      categoryId: raw.categoryId ?? raw.category_id ?? '',
      transactionType: raw.transactionType ?? raw.transaction_type,
      amount: String(raw.amount ?? '0'),
      currency: raw.currency ?? 'VND',
      status: raw.status ?? 'PENDING',
      description: raw.description ?? '',
      occurredAt: raw.occurredAt ?? raw.occurred_at ?? raw.createdAt ?? new Date().toISOString(),
      source: raw.source ?? 'MANUAL',
      idempotencyKey: raw.idempotencyKey ?? raw.idempotency_key ?? '',
      createdAt: raw.createdAt ?? new Date().toISOString(),
    } as Transaction;
  }

  private normalizeCategory(raw: CategoryApiResponse): Category {
    return {
      id: raw.id ?? raw._id ?? '',
      userId: raw.userId ?? raw.user_id ?? '',
      name: raw.name ?? '',
      categoryType: raw.categoryType ?? raw.category_type,
      parentId: raw.parentId ?? raw.parent_id ?? null,
      isSystem: Boolean(raw.isSystem ?? raw.is_system),
      status: Number(raw.status ?? 1) as 0 | 1,
      createdAt: raw.createdAt ?? new Date().toISOString(),
    } as Category;
  }

  private normalizeRecurringRule(raw: RecurringRuleApiResponse): RecurringRule {
    return {
      id: String(raw.id ?? raw._id ?? ''),
      userId: String(raw.userId ?? raw.user_id ?? ''),
      walletId: String(raw.walletId ?? raw.wallet_id ?? ''),
      categoryId: raw.categoryId ?? raw.category_id ?? null,
      transactionType: raw.transactionType ?? raw.transaction_type ?? 'EXPENSE',
      amount: Number(raw.amount ?? 0),
      currency: String(raw.currency ?? 'VND'),
      frequency: raw.frequency ?? 'MONTHLY',
      dayOfWeek: raw.dayOfWeek ?? raw.day_of_week ?? null,
      dayOfMonth: raw.dayOfMonth ?? raw.day_of_month ?? null,
      status: raw.status ?? 'ACTIVE',
      note: String(raw.note ?? ''),
      lastRunOn: raw.lastRunOn ?? raw.last_run_on ?? null,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    } as RecurringRule;
  }

  private normalizeSaving(raw: SavingApiResponse): SavingPackage {
    return {
      id: String(raw.id ?? raw._id ?? ''),
      userId: String(raw.userId ?? raw.user_id ?? ''),
      name: String(raw.name ?? 'Gói tiết kiệm'),
      type: (raw.type ?? 'SAVING') as SavingPackage['type'],
      targetAmount: raw.targetAmount ?? raw.target_amount ?? null,
      currentAmount: Number(raw.currentAmount ?? raw.current_amount ?? 0),
      startDate: String(raw.startDate ?? raw.start_date ?? new Date().toISOString()),
      endDate: raw.endDate ?? raw.end_date ?? null,
      status: (raw.status ?? 'ACTIVE') as SavingPackage['status'],
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    } as SavingPackage;
  }

  private normalizeInvoice(raw: InvoiceApiResponse): Invoice {
    return {
      id: raw.id ?? raw._id ?? '',
      userId: raw.userId ?? raw.user_id ?? '',
      imageUrl: raw.imageUrl ?? raw.image_url ?? '',
      extractedData: raw.extractedData ?? raw.extracted_data ?? {},
      status: raw.status ?? 'PENDING',
      transactionId: raw.transactionId ?? raw.transaction_id ?? null,
      auditTrail: (raw.auditTrail ?? raw.audit_trail ?? []).map((entry: Record<string, any>) => ({
        action: entry.action,
        changedBy: entry.changedBy ?? entry.changed_by ?? '',
        timestamp: entry.timestamp ?? new Date().toISOString(),
        previousState: entry.previousState ?? entry.previous_state ?? {},
        nextState: entry.nextState ?? entry.next_state ?? undefined,
        note: entry.note ?? null,
      })),
      deletedAt: raw.deletedAt ?? raw.deleted_at ?? null,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    } as Invoice;
  }

  private normalizeAnalyticsDashboard(raw: AnalyticsApiResponse): AnalyticsDashboardResponse {
    const summary = raw.summary ?? {};
    const kpis = raw.kpis ?? {};
    const insights = raw.insights ?? {};

    return {
      currentMonth: String(raw.currentMonth ?? ''),
      filters: {
        month: raw.filters?.month ?? null,
        walletId: raw.filters?.walletId ?? null,
        range: raw.filters?.range ?? null,
        from: raw.filters?.from ?? null,
        to: raw.filters?.to ?? null,
      },
      period: raw.period
        ? {
            range: String(raw.period.range ?? 'month'),
            label: String(raw.period.label ?? ''),
            startDate: String(raw.period.startDate ?? ''),
            endDate: String(raw.period.endDate ?? ''),
          }
        : undefined,
      summary: {
        totalIncome: Number(summary.totalIncome ?? 0),
        totalExpense: Number(summary.totalExpense ?? 0),
        net: Number(summary.net ?? summary.netCashFlow ?? 0),
        netCashFlow: Number(summary.netCashFlow ?? summary.net ?? 0),
      },
      kpis: {
        savingsRate: Number(kpis.savingsRate ?? 0),
        dailyAverageExpense: Number(kpis.dailyAverageExpense ?? 0),
        recurringSpend: Number(kpis.recurringSpend ?? 0),
        transactionCount: Number(kpis.transactionCount ?? 0),
      },
      insights: {
        severity: (insights.severity ?? 'neutral') as 'good' | 'warning' | 'neutral',
        headline: String(insights.headline ?? ''),
        message: String(insights.message ?? ''),
        recommendation: String(insights.recommendation ?? ''),
        spendingChangePercent: Number(insights.spendingChangePercent ?? 0),
        incomeChangePercent: Number(insights.incomeChangePercent ?? 0),
        savingsRate: Number(insights.savingsRate ?? 0),
        dailyAverageExpense: Number(insights.dailyAverageExpense ?? 0),
        riskiestCategory: insights.riskiestCategory ? String(insights.riskiestCategory) : null,
      },
      trend: Array.isArray(raw.trend)
        ? raw.trend.map((item: Record<string, any>) => ({
            monthKey: String(item.monthKey ?? ''),
            month: String(item.month ?? ''),
            income: Number(item.income ?? item.totalIncome ?? 0),
            expense: Number(item.expense ?? item.totalExpense ?? 0),
            net: Number(item.net ?? item.netCashFlow ?? 0),
          }))
        : [],
      breakdown: Array.isArray(raw.breakdown)
        ? raw.breakdown.map((item: Record<string, any>) => ({
            categoryId: String(item.categoryId ?? item.category_id ?? ''),
            name: String(item.name ?? item.category_name ?? 'Khác'),
            value: Number(item.value ?? item.total_amount ?? 0),
            color: item.color ?? null,
            transactionCount: Number(item.transactionCount ?? item.transaction_count ?? 0),
          }))
        : [],
      comparison: Array.isArray(raw.comparison)
        ? raw.comparison.map((item: Record<string, any>) => ({
            label: String(item.label ?? ''),
            income: Number(item.income ?? 0),
            expense: Number(item.expense ?? 0),
          }))
        : [],
      budgetProgress: Array.isArray(raw.budgetProgress)
        ? raw.budgetProgress.map((item: Record<string, any>) => ({
            category: String(item.category ?? 'Khác'),
            spent: Number(item.spent ?? 0),
            limit: Number(item.limit ?? 0),
            remaining: Number(item.remaining ?? 0),
            percent: Number(item.percent ?? 0),
          }))
        : [],
      forecast: Array.isArray(raw.forecast)
        ? raw.forecast.map((item: Record<string, any>) => ({
            label: String(item.label ?? ''),
            actual: item.actual == null ? undefined : Number(item.actual),
            forecast: item.forecast == null ? undefined : Number(item.forecast),
          }))
        : [],
      topTransactions: Array.isArray(raw.topTransactions)
        ? raw.topTransactions.map((item: Record<string, any>) => ({
            id: String(item.id ?? ''),
            merchant: String(item.merchant ?? item.description ?? 'Giao dịch'),
            category: String(item.category ?? 'Khác'),
            date: String(item.date ?? ''),
            amount: Number(item.amount ?? 0),
            transactionType: (item.transactionType ?? 'EXPENSE') as 'INCOME' | 'EXPENSE',
            source: item.source ? String(item.source) : undefined,
          }))
        : [],
      subscriptions: Array.isArray(raw.subscriptions)
        ? raw.subscriptions.map((item: Record<string, any>) => ({
            id: String(item.id ?? ''),
            name: String(item.name ?? 'Khoản định kỳ'),
            date: String(item.date ?? ''),
            amount: Number(item.amount ?? 0),
            frequency: (item.frequency ?? 'MONTHLY') as 'WEEKLY' | 'MONTHLY',
            status: (item.status ?? 'ACTIVE') as 'ACTIVE' | 'PAUSED',
          }))
        : [],
    };
  }

  private async uploadMultipart<T>(url: string, formData: FormData): Promise<T> {
    const response = await axiosClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  private normalizeAIOcrResponse(raw: AIOcrApiResponse): AIOcrResponse {
    const data = raw.data ?? {};

    return {
      success: Boolean(raw.success),
      data: {
        merchantName: String(data.merchantName ?? ''),
        totalAmount: Number.isFinite(Number(data.totalAmount)) ? Number(data.totalAmount) : null,
        transactionDate: typeof data.transactionDate === 'string' && data.transactionDate.trim()
          ? String(data.transactionDate)
          : null,
      },
    };
  }

  private normalizeAIChatResponse(raw: AIChatApiResponse): AIChatResponse {
    return {
      success: Boolean(raw.success),
      question: String(raw.question ?? ''),
      intent: String(raw.intent ?? 'unknown'),
      confidence: Number(raw.confidence ?? 0),
      scores: Object.fromEntries(
        Object.entries(raw.scores ?? {}).map(([key, value]) => [key, Number(value)])
      ),
      answer: String(raw.answer ?? ''),
      llmUsed: Boolean(raw.llm_used ?? raw.llmUsed),
      queryPlan: (raw.query_plan ?? raw.queryPlan ?? {}) as Record<string, unknown>,
      meta: (raw.meta ?? {}) as Record<string, unknown>,
    };
  }

  private normalizeAIExtractTextResponse(raw: AIExtractTextApiResponse): AIExtractTextResponse {
    return {
      success: Boolean(raw.success),
      input: String(raw.input ?? ''),
      rawOutput: String(raw.raw_output ?? raw.rawOutput ?? ''),
      model: String(raw.model ?? ''),
    };
  }

  // ===== WALLET ENDPOINTS =====

  async createWallet(data: CreateWalletInput): Promise<Wallet> {
    const response = await axiosClient.post('/api/v1/wallets', {
      wallet_type: data.walletType,
      wallet_name: data.walletName,
      balance: data.balance,
    });
    return this.normalizeWallet(response.data);
  }

  async getWallets(): Promise<Wallet[]> {
    const response = await axiosClient.get('/api/v1/wallets');
    return (response.data ?? []).map((item: WalletApiResponse) => this.normalizeWallet(item));
  }

  async getWallet(walletId: string): Promise<Wallet> {
    const response = await axiosClient.get(`/api/v1/wallets/${walletId}`);
    return this.normalizeWallet(response.data);
  }

  async updateWalletStatus(walletId: string, status: number): Promise<Wallet> {
    const payload = { status: Number(status) };
    const response = await axiosClient.put(`/api/v1/wallets/${walletId}/status`, payload);
    return this.normalizeWallet(response.data);
  }

  async updateWallet(
    walletId: string,
    data: { walletName?: string; balance?: number | null; status?: number }
  ): Promise<Wallet> {
    const payload: Record<string, unknown> = {};

    if (data.walletName !== undefined) {
      const walletName = String(data.walletName).trim();
      if (walletName.length > 0) {
        payload.wallet_name = walletName;
      }
    }

    if (data.balance !== undefined) {
      if (data.balance === null) {
        payload.balance = 0;
      } else if (Number.isFinite(Number(data.balance))) {
        payload.balance = Number(data.balance);
      }
    }

    if (data.status !== undefined && Number.isFinite(Number(data.status))) {
      payload.status = Number(data.status);
    }

    const response = await axiosClient.put(`/api/v1/wallets/${walletId}`, payload);
    return this.normalizeWallet(response.data);
  }

  async deleteWallet(walletId: string): Promise<void> {
    await axiosClient.delete(`/api/v1/wallets/${walletId}`);
  }

  async hasWalletTransactions(walletId: string): Promise<boolean> {
    const response = await axiosClient.get('/api/v1/transactions', {
      params: {
        wallet_id: walletId,
        limit: 1,
      },
    });

    const items = Array.isArray(response.data) ? response.data : [];
    return items.length > 0;
  }

  // ===== CATEGORY + TRANSACTION ENDPOINTS =====

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    const response = await axiosClient.post('/api/v1/categories', {
      name: data.name,
      category_type: data.categoryType,
      parent_id: data.parentId ?? null,
    });
    return this.normalizeCategory(response.data);
  }

  async getCategories(categoryType?: 'INCOME' | 'EXPENSE'): Promise<Category[]> {
    const response = await axiosClient.get('/api/v1/categories', {
      params: categoryType ? { category_type: categoryType } : undefined,
    });
    return (response.data ?? []).map((item: CategoryApiResponse) => this.normalizeCategory(item));
  }

  async updateCategory(
    categoryId: string,
    data: { name?: string; categoryType?: 'INCOME' | 'EXPENSE'; parentId?: string | null; status?: number }
  ): Promise<Category> {
    const response = await axiosClient.put(`/api/v1/categories/${categoryId}`, {
      name: data.name,
      category_type: data.categoryType,
      parent_id: data.parentId,
      status: data.status,
    });
    return this.normalizeCategory(response.data);
  }

  async deleteCategory(categoryId: string): Promise<{ success: boolean; id: string }> {
    const response = await axiosClient.delete(`/api/v1/categories/${categoryId}`);
    return {
      success: Boolean(response.data?.success),
      id: String(response.data?.id ?? categoryId),
    };
  }

  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const idempotencyKey = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `txn-${Date.now()}`;

    const response = await axiosClient.post('/api/v1/transactions', {
      wallet_id: data.walletId,
      category_id: data.categoryId,
      amount: data.amount,
      transaction_type: data.transactionType,
      currency: data.currency ?? 'VND',
      description: data.description ?? '',
      occurred_at: data.occurredAt,
      idempotency_key: idempotencyKey,
    });
    return this.normalizeTransaction(response.data);
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await axiosClient.get(`/api/v1/transactions/${transactionId}`);
    return this.normalizeTransaction(response.data);
  }

  async getTransactions(limit: number = 50, skip: number = 0): Promise<Transaction[]> {
    const response = await axiosClient.get('/api/v1/transactions', {
      params: { limit, skip },
    });
    return (response.data ?? []).map((item: TransactionApiResponse) => this.normalizeTransaction(item));
  }

  async getWalletTransactions(walletId: string, limit: number = 50, skip: number = 0): Promise<Transaction[]> {
    const response = await axiosClient.get('/api/v1/transactions', {
      params: { wallet_id: walletId, limit, skip },
    });
    return (response.data ?? []).map((item: TransactionApiResponse) => this.normalizeTransaction(item));
  }

  async getRecurringRules(): Promise<RecurringRule[]> {
    const response = await axiosClient.get('/api/v1/transactions/recurring-rules');
    return (response.data ?? []).map((item: RecurringRuleApiResponse) => this.normalizeRecurringRule(item));
  }

  async createRecurringRule(data: CreateRecurringRuleInput): Promise<RecurringRule> {
    const response = await axiosClient.post('/api/v1/transactions/recurring-rules', {
      wallet_id: data.walletId,
      category_id: data.categoryId,
      transaction_type: data.transactionType,
      amount: Number(data.amount),
      currency: data.currency ?? 'VND',
      frequency: data.frequency,
      day_of_week: data.dayOfWeek ?? null,
      day_of_month: data.dayOfMonth ?? null,
      status: data.status ?? 'ACTIVE',
      note: data.note ?? '',
    });

    return this.normalizeRecurringRule(response.data);
  }

  async updateRecurringRule(ruleId: string, data: UpdateRecurringRuleInput): Promise<RecurringRule> {
    const payload: Record<string, unknown> = {};

    if (data.walletId !== undefined) payload.wallet_id = data.walletId;
    if (data.categoryId !== undefined) payload.category_id = data.categoryId;
    if (data.transactionType !== undefined) payload.transaction_type = data.transactionType;
    if (data.amount !== undefined) payload.amount = Number(data.amount);
    if (data.currency !== undefined) payload.currency = data.currency;
    if (data.frequency !== undefined) payload.frequency = data.frequency;
    if (data.dayOfWeek !== undefined) payload.day_of_week = data.dayOfWeek;
    if (data.dayOfMonth !== undefined) payload.day_of_month = data.dayOfMonth;
    if (data.status !== undefined) payload.status = data.status;
    if (data.note !== undefined) payload.note = data.note;

    const response = await axiosClient.put(`/api/v1/transactions/recurring-rules/${ruleId}`, payload);
    return this.normalizeRecurringRule(response.data);
  }

  async deleteRecurringRule(ruleId: string): Promise<{ success: boolean; id: string }> {
    const response = await axiosClient.delete(`/api/v1/transactions/recurring-rules/${ruleId}`);
    return {
      success: Boolean(response.data?.success),
      id: String(response.data?.id ?? ruleId),
    };
  }

  async getAnalyticsDashboard(filters?: {
    month?: string;
    walletId?: string;
    type?: 'monthly' | 'yearly' | string;
    range?: 'month' | 'quarter' | 'year' | 'custom' | string;
    from?: string;
    to?: string;
  }): Promise<AnalyticsDashboardResponse> {
    const params: Record<string, string> = {};

    if (filters?.month) {
      params.month = filters.month;
    }

    if (filters?.walletId) {
      params.wallet_id = filters.walletId;
    }

    if (filters?.type) {
      params.type = filters.type;
    }

    if (filters?.range) {
      params.range = filters.range;
    }

    if (filters?.from) {
      params.from = filters.from;
    }

    if (filters?.to) {
      params.to = filters.to;
    }

    const response = await axiosClient.get('/api/v1/analytics/dashboard', { params });
    return this.normalizeAnalyticsDashboard(response.data ?? {});
  }

  async getSavings(type?: 'SAVING' | 'INVESTMENT'): Promise<SavingPackage[]> {
    const response = await axiosClient.get('/api/v1/savings', {
      params: type ? { type } : undefined,
    });
    return (response.data ?? []).map((item: SavingApiResponse) => this.normalizeSaving(item));
  }

  async createSaving(data: CreateSavingInput): Promise<SavingPackage> {
    const response = await axiosClient.post('/api/v1/savings', {
      name: data.name,
      type: data.type,
      target_amount: data.targetAmount ?? null,
      start_date: data.startDate ?? new Date().toISOString(),
      end_date: data.endDate ?? null,
    });
    return this.normalizeSaving(response.data ?? {});
  }

  async depositToSaving(savingId: string, data: DepositSavingInput): Promise<{ saving: SavingPackage; transaction: Transaction }> {
    const response = await axiosClient.post(`/api/v1/savings/${savingId}/deposit`, {
      sourceWalletId: data.sourceWalletId,
      amount: Number(data.amount),
    });

    return {
      saving: this.normalizeSaving(response.data?.saving ?? {}),
      transaction: this.normalizeTransaction(response.data?.transaction ?? {}),
    };
  }

  async settleSaving(savingId: string, data?: SettleSavingInput): Promise<{ saving: SavingPackage; transaction: Transaction | null }> {
    const settleType = data?.settleType ?? 'FULL';

    const response = await axiosClient.post(`/api/v1/savings/${savingId}/settle`, {
      settleType,
      destinationWalletId: data?.destinationWalletId ?? null,
      amount: data?.amount ?? null,
    });

    return {
      saving: this.normalizeSaving(response.data?.saving ?? {}),
      transaction: response.data?.transaction ? this.normalizeTransaction(response.data.transaction) : null,
    };
  }

  // ===== AI SERVICE ENDPOINTS =====

  async ocrInvoice(file: File): Promise<AIOcrResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Calls Node.js service-transaction which saves the file then internally
    // forwards to Python ai-service (PaddleOCR) for extraction.
    const response = await axiosClient.post('/api/v1/invoices/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120_000, // PaddleOCR cold-start can take ~30s on first call
    });

    return this.normalizeAIOcrResponse(response.data ?? {});
  }

  async askAI(data: AIChatRequest): Promise<AIChatResponse> {
    const response = await aiAxiosClient.post('/api/v1/ai/chat', {
      message: data.question,
      question: data.question,
      sessionId: data.sessionId,
      context: data.context ?? {},
      use_llm: data.useLlm ?? false,
      month: data.month,
      walletId: data.walletId,
      range: data.range,
      from: data.from,
      to: data.to,
    });

    return this.normalizeAIChatResponse(response.data ?? {});
  }

  async extractTransactionsFromText(inputText: string): Promise<AIExtractTextResponse> {
    const response = await aiAxiosClient.post('/api/v1/ai/extract-text', {
      input_text: inputText,
    });

    return this.normalizeAIExtractTextResponse(response.data ?? {});
  }

  // ===== INVOICE ENDPOINTS =====

  async uploadInvoice(file: File, extractedData: Record<string, unknown> = {}): Promise<Invoice> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extracted_data', JSON.stringify(extractedData));

    const data = await this.uploadMultipart<InvoiceApiResponse>('/api/v1/invoices/upload', formData);
    return this.normalizeInvoice(data);
  }

  async getInvoices(): Promise<Invoice[]> {
    const response = await axiosClient.get('/api/v1/invoices');
    return (response.data ?? []).map((item: InvoiceApiResponse) => this.normalizeInvoice(item));
  }

  async updateInvoice(invoiceId: string, data: UpdateInvoiceInput): Promise<Invoice> {
    const response = await axiosClient.put(`/api/v1/invoices/${invoiceId}`, {
      image_url: data.imageUrl,
      extracted_data: data.extractedData,
      status: data.status,
    });
    return this.normalizeInvoice(response.data);
  }

  async deleteInvoice(invoiceId: string): Promise<Invoice> {
    const response = await axiosClient.delete(`/api/v1/invoices/${invoiceId}`);
    return this.normalizeInvoice(response.data);
  }

  async confirmInvoice(invoiceId: string, data: ConfirmInvoiceInput): Promise<{ invoice: Invoice; transaction: Transaction }> {
    const response = await axiosClient.post(`/api/v1/invoices/${invoiceId}/confirm`, {
      wallet_id: data.walletId,
      category_id: data.categoryId,
      amount: data.amount,
      transaction_type: data.transactionType ?? 'EXPENSE',
      currency: data.currency ?? 'VND',
      description: data.description ?? '',
      occurred_at: data.occurredAt,
      extracted_data: data.extractedData,
    });

    return {
      invoice: this.normalizeInvoice(response.data?.invoice ?? {}),
      transaction: this.normalizeTransaction(response.data?.transaction ?? {}),
    };
  }

  async getProtectedFileUrl(filePath: string): Promise<string> {
    const response = await axiosClient.get(filePath, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  }
}

export const apiClient = new ApiClient();
