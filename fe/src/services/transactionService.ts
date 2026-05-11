import { apiClient } from '@/lib/apiClient';
import type {
  Transaction,
  Category,
  CreateTransactionInput,
  CreateCategoryInput,
} from '@/types/finance';

export function getTransactions(limit = 50, offset = 0): Promise<Transaction[]> {
  return apiClient.getTransactions(limit, offset);
}

export function createTransaction(data: CreateTransactionInput): Promise<Transaction> {
  return apiClient.createTransaction(data);
}


export function getCategories(categoryType?: 'INCOME' | 'EXPENSE'): Promise<Category[]> {
  return apiClient.getCategories(categoryType);
}

export function createCategory(data: CreateCategoryInput): Promise<Category> {
  return apiClient.createCategory(data);
}

export function updateCategory(
  categoryId: string,
  data: { name?: string; categoryType?: 'INCOME' | 'EXPENSE'; parentId?: string | null; status?: number }
): Promise<Category> {
  return apiClient.updateCategory(categoryId, data);
}

export function deleteCategory(categoryId: string): Promise<{ success: boolean; id: string }> {
  return apiClient.deleteCategory(categoryId);
}
