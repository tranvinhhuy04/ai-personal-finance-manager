import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { financeApi } from '../api/finance';
import type { AnalyticsDashboardResponse, SavingPackage, TimeRange, Wallet } from '../types/finance';

function parseBalance(value: unknown): number {
  const normalized = String(value ?? '0').replace(/,/g, '').replace(/\s/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumSavingAmount(items: SavingPackage[]) {
  return items.reduce((sum, item) => sum + Number(item.currentAmount || 0), 0);
}

function sumWalletAmount(items: Wallet[]) {
  return items.reduce((sum, item) => sum + parseBalance(item.balance), 0);
}

export function useDashboardOverview(range: TimeRange = 'month') {
  // 3 query song song: ví, tiết kiệm/đầu tư, analytics
  // Mỗi query độc lập – lỗi 1 query không ảnh hưởng query còn lại
  const walletsQuery = useQuery({
    queryKey: ['mobile-dashboard-overview-wallets'],
    queryFn: () => financeApi.getWallets(),
    staleTime: 60_000,
    retry: 1,
  });

  const savingsQuery = useQuery({
    queryKey: ['mobile-dashboard-overview-savings'],
    // Gọi cả SAVING và INVESTMENT trong 1 Promise.all – giảm số round-trip
    queryFn: () => Promise.all([financeApi.getSavings('SAVING'), financeApi.getSavings('INVESTMENT')]),
    staleTime: 60_000,
    retry: 1,
  });

  const analyticsQuery = useQuery({
    queryKey: ['mobile-dashboard-overview-analytics', range],
    queryFn: () => financeApi.getAnalyticsDashboard({ range }),
    staleTime: 60_000,
    retry: 1,
  });

  const wallets = walletsQuery.data ?? [];
  const [savings = [], investments = []] = savingsQuery.data ?? [[], []];
  const analytics: AnalyticsDashboardResponse | undefined = analyticsQuery.data;

  const data = useMemo(() => {
    const totalBalance = sumWalletAmount(wallets);
    const totalSavings = sumSavingAmount(savings);
    const totalInvestments = sumSavingAmount(investments);
    const totalWallets = wallets.length;
    const activeWallets = wallets.filter((wallet) => wallet.status === 1).length;

    return {
      totalBalance,
      totalSavings,
      totalInvestments,
      totalWallets,
      activeWallets,
      periodLabel: analytics?.period?.label ?? 'Tháng này',
      totalIncome: analytics?.summary.totalIncome ?? 0,
      totalExpense: analytics?.summary.totalExpense ?? 0,
      netCashFlow: analytics?.summary.net ?? analytics?.summary.netCashFlow ?? 0,
      cashflowBars: analytics?.trend?.slice(-6) ?? [],
      topCategory: analytics?.breakdown?.[0] ?? null,
      latestTransactions: analytics?.topTransactions?.slice(0, 3) ?? [],
      insights: analytics?.insights ?? null,
    };
  }, [analytics, investments, savings, wallets]);

  const isLoading = walletsQuery.isLoading || savingsQuery.isLoading || analyticsQuery.isLoading;
  const isRefreshing = walletsQuery.isRefetching || savingsQuery.isRefetching || analyticsQuery.isRefetching;

  const refetchAll = async () => {
    await Promise.all([walletsQuery.refetch(), savingsQuery.refetch(), analyticsQuery.refetch()]);
  };

  return {
    data,
    isLoading,
    isRefreshing,
    errorMessage:
      (walletsQuery.error instanceof Error && walletsQuery.error.message) ||
      (savingsQuery.error instanceof Error && savingsQuery.error.message) ||
      (analyticsQuery.error instanceof Error && analyticsQuery.error.message) ||
      null,
    refetch: refetchAll,
  };
}
