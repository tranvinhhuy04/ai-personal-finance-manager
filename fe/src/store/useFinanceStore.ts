/**
 * Zustand stores for managing Wallet & Transaction state
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import type {
  Wallet,
  Category,
  Transaction,
  RecurringRule,
  CreateRecurringRuleInput,
  UpdateRecurringRuleInput,
} from '@/types/finance';

// Re-export so existing component imports from '@/store/useFinanceStore' keep working
export type { Wallet, Category, Transaction, RecurringRule } from '@/types/finance';

export interface WalletStore {
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
  fetchWallets: () => Promise<void>;
  createWallet: (data: {
    walletType: 'CARD' | 'MOMO' | 'ZALOPAY' | 'CASH';
    walletName: string;
    balance?: string;
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
  isFetchingCategories: boolean;
  error: string | null;
  categoryError: string | null;
  fetchTransactions: (limit?: number, skip?: number) => Promise<void>;
  fetchCategories: (categoryType?: 'INCOME' | 'EXPENSE') => Promise<Category[]>;
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
  updateCategory: (categoryId: string, data: {
    name?: string;
    categoryType?: 'INCOME' | 'EXPENSE';
    parentId?: string | null;
    status?: number;
  }) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  getWalletTransactions: (walletId: string) => Promise<Transaction[]>;
  refreshTransactions: () => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  categories: [],
  isLoading: false,
  isFetchingCategories: false,
  error: null,
  categoryError: null,

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

  fetchCategories: async (categoryType) => {
    set({ isFetchingCategories: true, categoryError: null });
    try {
      const categories = await apiClient.getCategories(categoryType);
      set({ categories: categories || [], isFetchingCategories: false });
      return categories || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      set({ categoryError: message, isFetchingCategories: false });
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
    set({ isLoading: true, categoryError: null });
    try {
      const category = await apiClient.createCategory(data);
      set((state) => ({
        categories: [...state.categories.filter((item) => item.id !== category.id), category],
        isLoading: false,
      }));
      return category;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';
      set({ categoryError: message, isLoading: false });
      throw error;
    }
  },

  updateCategory: async (categoryId, data) => {
    set({ isLoading: true, categoryError: null });
    try {
      const updated = await apiClient.updateCategory(categoryId, data);
      set((state) => ({
        categories: state.categories.map((item) => (item.id === categoryId ? updated : item)),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      set({ categoryError: message, isLoading: false });
      throw error;
    }
  },

  deleteCategory: async (categoryId) => {
    set({ isLoading: true, categoryError: null });
    try {
      await apiClient.deleteCategory(categoryId);
      set((state) => ({
        categories: state.categories.filter((item) => item.id !== categoryId),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';
      set({ categoryError: message, isLoading: false });
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

export interface RecurringStore {
  recurringRules: RecurringRule[];
  isLoading: boolean;
  error: string | null;
  fetchRecurringRules: () => Promise<void>;
  createRecurringRule: (data: CreateRecurringRuleInput) => Promise<RecurringRule>;
  updateRecurringRule: (ruleId: string, data: UpdateRecurringRuleInput) => Promise<RecurringRule>;
  deleteRecurringRule: (ruleId: string) => Promise<void>;
}

export const useRecurringStore = create<RecurringStore>((set) => ({
  recurringRules: [],
  isLoading: false,
  error: null,

  fetchRecurringRules: async () => {
    set({ isLoading: true, error: null });
    try {
      const recurringRules = await apiClient.getRecurringRules();
      set({ recurringRules: recurringRules || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch recurring rules';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createRecurringRule: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiClient.createRecurringRule(data);
      set((state) => ({
        recurringRules: [created, ...state.recurringRules],
        isLoading: false,
      }));
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create recurring rule';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateRecurringRule: async (ruleId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiClient.updateRecurringRule(ruleId, data);
      set((state) => ({
        recurringRules: state.recurringRules.map((item) => (item.id === ruleId ? updated : item)),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update recurring rule';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteRecurringRule: async (ruleId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.deleteRecurringRule(ruleId);
      set((state) => ({
        recurringRules: state.recurringRules.filter((item) => item.id !== ruleId),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete recurring rule';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
}));
