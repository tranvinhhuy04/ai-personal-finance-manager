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
} from '@/types/finance';
import { axiosClient } from '@/utils/axiosClient';

type WalletApiResponse = Record<string, any>;
type TransactionApiResponse = Record<string, any>;
type CategoryApiResponse = Record<string, any>;
type InvoiceApiResponse = Record<string, any>;
type AnalyticsApiResponse = Record<string, any>;

class ApiClient {
  private normalizeWallet(raw: WalletApiResponse): Wallet {
    return {
      id: raw.id,
      userId: raw.userId ?? raw.user_id ?? '',
      walletType: raw.walletType ?? raw.wallet_type,
      walletName: raw.walletName ?? raw.wallet_name ?? raw.walletType ?? raw.wallet_type ?? 'Wallet',
      balance: String(raw.balance ?? '0'),
      spendingLimit: raw.spendingLimit ?? raw.spending_limit ?? null,
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

    return {
      currentMonth: String(raw.currentMonth ?? ''),
      filters: {
        month: raw.filters?.month ?? null,
        walletId: raw.filters?.walletId ?? null,
      },
      summary: {
        totalIncome: Number(summary.totalIncome ?? 0),
        totalExpense: Number(summary.totalExpense ?? 0),
        net: Number(summary.net ?? summary.netCashFlow ?? 0),
        netCashFlow: Number(summary.netCashFlow ?? summary.net ?? 0),
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

  // ===== WALLET ENDPOINTS =====

  async createWallet(data: CreateWalletInput): Promise<Wallet> {
    const response = await axiosClient.post('/api/v1/wallets', {
      wallet_type: data.walletType,
      wallet_name: data.walletName,
      spending_limit: data.spendingLimit,
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

  async updateWalletSpendingLimit(walletId: string, spendingLimit: string): Promise<Wallet> {
    const response = await axiosClient.patch(`/api/v1/wallets/${walletId}/spending-limit`, {
      spendingLimit,
    });
    return this.normalizeWallet(response.data);
  }

  async updateWallet(
    walletId: string,
    data: { walletName?: string; spendingLimit?: number | null; status?: number }
  ): Promise<Wallet> {
    const payload: Record<string, unknown> = {};

    if (data.walletName !== undefined) {
      const walletName = String(data.walletName).trim();
      if (walletName.length > 0) {
        payload.wallet_name = walletName;
      }
    }

    if (data.spendingLimit !== undefined) {
      if (data.spendingLimit === null) {
        payload.spending_limit = null;
      } else if (Number.isFinite(Number(data.spendingLimit))) {
        payload.spending_limit = Number(data.spendingLimit);
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

  async getAnalyticsDashboard(filters?: { month?: string; walletId?: string }): Promise<AnalyticsDashboardResponse> {
    const params: Record<string, string> = {};

    if (filters?.month) {
      params.month = filters.month;
    }

    if (filters?.walletId) {
      params.wallet_id = filters.walletId;
    }

    const response = await axiosClient.get('/api/v1/analytics/dashboard', { params });
    return this.normalizeAnalyticsDashboard(response.data ?? {});
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
