/**
 * Zustand stores for managing Wallet & Transaction state
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import type { Wallet, Category, Transaction } from '@/types/finance';

// Re-export so existing component imports from '@/store/useFinanceStore' keep working
export type { Wallet, Category, Transaction } from '@/types/finance';

export interface WalletStore {
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
  fetchWallets: () => Promise<void>;
  createWallet: (data: {
    walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';
    walletName: string;
    spendingLimit?: string;
  }) => Promise<Wallet>;
  updateWalletBalance: (walletId: string, newBalance: string) => void;
  refreshWallets: () => Promise<void>;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallets: [],
  isLoading: false,
  error: null,

  fetchWallets: async () => {
    set({ isLoading: true, error: null });
    try {
      const wallets = await apiClient.getWallets();
      set({ wallets: wallets || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch wallets';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createWallet: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newWallet = await apiClient.createWallet(data);
      set((state) => ({
        wallets: [...state.wallets, newWallet],
        isLoading: false,
      }));
      return newWallet;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create wallet';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateWalletBalance: (walletId: string, newBalance: string) => {
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, balance: newBalance } : w
      ),
    }));
  },

  refreshWallets: async () => {
    await get().fetchWallets();
  },
}));

// ===== TRANSACTION TYPES — defined in @/types/finance, re-exported above =====

export interface TransactionStore {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: (limit?: number, skip?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createTransaction: (data: {
    walletId: string;
    categoryId: string;
    transactionType: 'INCOME' | 'EXPENSE';
    amount: string;
    currency?: string;
    description?: string;
    occurredAt?: string;
  }) => Promise<Transaction>;
  createCategory: (data: {
    name: string;
    categoryType: 'INCOME' | 'EXPENSE';
    parentId?: string | null;
  }) => Promise<Category>;
  getWalletTransactions: (walletId: string) => Promise<Transaction[]>;
  refreshTransactions: () => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchTransactions: async (limit = 50, skip = 0) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await apiClient.getTransactions(limit, skip);
      set({ transactions: transactions || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await apiClient.getCategories();
      set({ categories: categories || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createTransaction: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await apiClient.createTransaction(data);
      set((state) => ({
        transactions: [transaction, ...state.transactions],
        isLoading: false,
      }));
      return transaction;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transaction';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const category = await apiClient.createCategory(data);
      set((state) => ({
        categories: [...state.categories, category],
        isLoading: false,
      }));
      return category;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  getWalletTransactions: async (walletId: string) => {
    try {
      return await apiClient.getWalletTransactions(walletId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch wallet transactions';
      set({ error: message });
      throw error;
    }
  },

  refreshTransactions: async () => {
    await get().fetchTransactions();
  },
}));
