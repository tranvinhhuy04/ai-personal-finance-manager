/**
 * API Client for OripioFin Frontend
 * All requests go through API Gateway.
 * Set VITE_API_URL in .env to configure the gateway URL.
 */

import type {
  Wallet,
  Category,
  Transaction,
  CreateWalletInput,
  CreateTransactionInput,
  CreateCategoryInput,
} from '@/types/finance';

// Vite exposes custom env vars via import.meta.env.VITE_*
// Set VITE_API_URL in .env to override the default gateway URL.
const API_BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ??
  'http://localhost:3000/api/v1';

interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(body.message ?? `API Error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private getAuthHeader(): Record<string, string> {
    // Auth.tsx saves the JWT under 'accessToken' via localStorage.setItem('accessToken', token)
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ===== WALLET ENDPOINTS =====
  
  async createWallet(data: CreateWalletInput): Promise<Wallet> {
    return this.request<Wallet>('/wallets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWallets(): Promise<Wallet[]> {
    return this.request<Wallet[]>('/wallets');
  }

  async getWallet(walletId: string): Promise<Wallet> {
    return this.request<Wallet>(`/wallets/${walletId}`);
  }

  async updateWalletStatus(walletId: string, status: number): Promise<Wallet> {
    return this.request<Wallet>(`/wallets/${walletId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateWalletSpendingLimit(walletId: string, spendingLimit: string): Promise<Wallet> {
    return this.request<Wallet>(`/wallets/${walletId}/spending-limit`, {
      method: 'PATCH',
      body: JSON.stringify({ spendingLimit }),
    });
  }

  async updateWallet(walletId: string, data: { status?: number; spendingLimit?: number | null }): Promise<Wallet> {
    return this.request<Wallet>(`/wallets/${walletId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ===== TRANSACTION ENDPOINTS =====

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${transactionId}`);
  }

  async getTransactions(limit: number = 50, skip: number = 0): Promise<Transaction[]> {
    return this.request<Transaction[]>(`/transactions?limit=${limit}&skip=${skip}`);
  }

  async getWalletTransactions(
    walletId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<Transaction[]> {
    return this.request<Transaction[]>(
      `/wallets/${walletId}/transactions?limit=${limit}&skip=${skip}`
    );
  }
}

export const apiClient = new ApiClient();
