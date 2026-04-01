import type {
  Wallet,
  Category,
  Transaction,
  CreateWalletInput,
  CreateTransactionInput,
  CreateCategoryInput,
} from '@/types/finance';
import { axiosClient } from '@/utils/axiosClient';

type WalletApiResponse = Record<string, any>;
type TransactionApiResponse = Record<string, any>;
type CategoryApiResponse = Record<string, any>;

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
      occurredAt: raw.occurredAt ?? raw.createdAt ?? new Date().toISOString(),
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
    const response = await axiosClient.patch(`/api/v1/wallets/${walletId}/status`, { status });
    return this.normalizeWallet(response.data);
  }

  async updateWalletSpendingLimit(walletId: string, spendingLimit: string): Promise<Wallet> {
    const response = await axiosClient.patch(`/api/v1/wallets/${walletId}/spending-limit`, {
      spendingLimit,
    });
    return this.normalizeWallet(response.data);
  }

  async updateWallet(walletId: string, data: { status?: number; spendingLimit?: number | null }): Promise<Wallet> {
    const response = await axiosClient.put(`/api/v1/wallets/${walletId}`, data);
    return this.normalizeWallet(response.data);
  }

  // ===== TRANSACTION ENDPOINTS =====

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    const response = await axiosClient.post('/api/v1/categories', {
      name: data.name,
      category_type: data.categoryType,
      parent_id: data.parentId ?? null,
    });
    return this.normalizeCategory(response.data);
  }

  async getCategories(): Promise<Category[]> {
    const response = await axiosClient.get('/api/v1/categories');
    return (response.data ?? []).map((item: CategoryApiResponse) => this.normalizeCategory(item));
  }

  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const response = await axiosClient.post('/api/v1/transactions', {
      wallet_id: data.walletId,
      amount: data.amount,
      transaction_type: data.transactionType,
      idempotency_key: crypto.randomUUID(),
    });
    return this.normalizeTransaction(response.data);
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await axiosClient.get(`/api/v1/transactions/${transactionId}`);
    return this.normalizeTransaction(response.data);
  }

  async getTransactions(limit: number = 50, skip: number = 0): Promise<Transaction[]> {
    const response = await axiosClient.get(`/api/v1/transactions?limit=${limit}&skip=${skip}`);
    return (response.data ?? []).map((item: TransactionApiResponse) => this.normalizeTransaction(item));
  }

  async getWalletTransactions(
    walletId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<Transaction[]> {
    const response = await axiosClient.get(
      `/api/v1/transactions/wallets/${walletId}/transactions?limit=${limit}&skip=${skip}`
    );
    return (response.data ?? []).map((item: TransactionApiResponse) => this.normalizeTransaction(item));
  }
}

export const apiClient = new ApiClient();
