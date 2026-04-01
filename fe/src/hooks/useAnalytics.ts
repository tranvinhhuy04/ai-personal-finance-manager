import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '@/utils/axiosClient';

export interface AnalyticsFilter {
  month?: string;
  walletId?: string;
}

export interface TrendPoint {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}

export interface CategoryPoint {
  category_id: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
}

export interface WalletPoint {
  wallet_id: string;
  wallet_name: string;
  total_amount: number;
  transaction_count: number;
}

export interface AnalyticsDashboardResponse {
  currentMonth: string;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    byCategory: CategoryPoint[];
    byWallet: WalletPoint[];
  };
  trend: TrendPoint[];
}

async function fetchAnalytics(filters?: AnalyticsFilter): Promise<AnalyticsDashboardResponse> {
  const params: Record<string, string> = {};

  if (filters?.month) {
    params.month = filters.month;
  }

  if (filters?.walletId) {
    params.wallet_id = filters.walletId;
  }

  const response = await axiosClient.get<AnalyticsDashboardResponse>('/api/v1/analytics/dashboard', {
    params,
  });

  return response.data;
}

export function useAnalytics(filters?: AnalyticsFilter) {
  const query = useQuery({
    queryKey: ['analytics-dashboard', filters?.month ?? 'all', filters?.walletId ?? 'all'],
    queryFn: () => fetchAnalytics(filters),
    staleTime: 60 * 1000,
  });

  const chartData = useMemo(() => {
    const dashboard = query.data;
    if (!dashboard) {
      return {
        trend: [] as TrendPoint[],
        categoryBreakdown: [] as CategoryPoint[],
        walletBreakdown: [] as WalletPoint[],
      };
    }

    return {
      trend: dashboard.trend,
      categoryBreakdown: dashboard.summary.byCategory ?? [],
      walletBreakdown: dashboard.summary.byWallet ?? [],
    };
  }, [query.data]);

  return {
    ...query,
    chartData,
  };
}
