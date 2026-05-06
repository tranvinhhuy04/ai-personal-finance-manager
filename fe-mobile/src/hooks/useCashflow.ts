import { useQuery } from '@tanstack/react-query';

import { financeApi } from '../api/finance';
import type { TimeRange } from '../types/finance';
import { getDemoAnalytics } from '../utils/demoData';

export function useCashflow(range: TimeRange = 'month', walletId?: string) {
  const query = useQuery({
    queryKey: ['mobile-analytics', range, walletId ?? 'all'],
    queryFn: () => financeApi.getAnalyticsDashboard({ range, walletId }),
    staleTime: 60_000,
    retry: 1,
  });

  return {
    data: query.data ?? (query.isError ? getDemoAnalytics(range) : undefined),
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    isDemoMode: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
