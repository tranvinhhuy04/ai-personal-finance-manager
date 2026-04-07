import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { financeApi } from '../api/finance';
import type { AnalyticsDashboardResponse, SavingPackage, TimeRange, Wallet } from '../types/finance';
import { DEMO_WALLETS, getDemoAnalytics } from '../utils/demoData';

function sumSavingAmount(items: SavingPackage[]) {
  return items.reduce((sum, item) => sum + Number(item.currentAmount || 0), 0);
}

function sumWalletAmount(items: Wallet[]) {
  return items.reduce((sum, item) => sum + Number(item.balance || 0), 0);
}

export function useDashboardOverview(range: TimeRange = 'month') {
  const walletsQuery = useQuery({
    queryKey: ['mobile-dashboard-overview-wallets'],
    queryFn: () => financeApi.getWallets(),
    staleTime: 60_000,
    retry: 1,
  });

  const savingsQuery = useQuery({
    queryKey: ['mobile-dashboard-overview-savings'],
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

  const wallets = walletsQuery.data ?? (walletsQuery.isError ? DEMO_WALLETS : []);
  const [savings = [], investments = []] = savingsQuery.data ?? [[], []];
  const analytics: AnalyticsDashboardResponse | undefined =
    analyticsQuery.data ?? (analyticsQuery.isError ? getDemoAnalytics(range) : undefined);

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
  const isDemoMode = walletsQuery.isError || savingsQuery.isError || analyticsQuery.isError;

  const refetchAll = async () => {
    await Promise.all([walletsQuery.refetch(), savingsQuery.refetch(), analyticsQuery.refetch()]);
  };

  return {
    data,
    isLoading,
    isRefreshing,
    isDemoMode,
    errorMessage:
      (walletsQuery.error instanceof Error && walletsQuery.error.message) ||
      (savingsQuery.error instanceof Error && savingsQuery.error.message) ||
      (analyticsQuery.error instanceof Error && analyticsQuery.error.message) ||
      null,
    refetch: refetchAll,
  };
}
