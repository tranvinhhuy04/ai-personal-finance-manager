import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financeApi } from '../api/finance';
import type { Category, CreateTransactionInput } from '../types/finance';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Ăn uống', type: 'EXPENSE' },
  { id: 'transport', name: 'Di chuyển', type: 'EXPENSE' },
  { id: 'shopping', name: 'Mua sắm', type: 'EXPENSE' },
  { id: 'bills', name: 'Hóa đơn', type: 'EXPENSE' },
  { id: 'entertainment', name: 'Giải trí', type: 'EXPENSE' },
  { id: 'health', name: 'Y tế', type: 'EXPENSE' },
  { id: 'education', name: 'Giáo dục', type: 'EXPENSE' },
  { id: 'salary', name: 'Lương', type: 'INCOME' },
  { id: 'freelance', name: 'Thu nhập phụ', type: 'INCOME' },
  { id: 'investment', name: 'Đầu tư', type: 'INCOME' },
  { id: 'other', name: 'Khác', type: 'EXPENSE' },
];

export function useTransactions(walletId?: string) {
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['mobile-transactions', walletId ?? 'all'],
    queryFn: () => financeApi.getTransactions({ walletId, limit: 50 }),
    staleTime: 30_000,
    retry: 1,
  });

  const categoriesQuery = useQuery({
    queryKey: ['mobile-categories'],
    queryFn: () => financeApi.getCategories(),
    staleTime: 300_000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTransactionInput) => financeApi.createTransaction(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['mobile-wallets'] });
    },
  });

  const categories = categoriesQuery.data ?? DEFAULT_CATEGORIES;

  return {
    transactions: transactionsQuery.data ?? [],
    categories,
    isLoading: transactionsQuery.isLoading,
    isRefreshing: transactionsQuery.isRefetching,
    errorMessage: transactionsQuery.error instanceof Error ? transactionsQuery.error.message : null,
    refetch: transactionsQuery.refetch,
    createTransaction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
