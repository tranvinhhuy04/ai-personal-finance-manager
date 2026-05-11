import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Wallet } from '@/types/finance';

export interface StatData {
  title: string;
  subtitle: string;
  amount: number;
  growth: number;
  isPositive: boolean;
  isPrimary?: boolean;
}

export interface WalletCurrency {
  id: string;
  name: string;
  type: 'techcombank' | 'momo' | 'zalopay' | 'cash';
  amount: number;
  limit: string;
  status: 'Hoạt động' | 'Tạm khóa';
}

export interface CashFlowData {
  month: string;
  cashflow: number;
  outflow: number;
  inflow: number;
}

export interface DashboardData {
  overview: {
    balance: StatData;
    savings: StatData;
    investment: StatData;
  };
  wallet: {
    exchangeRate: string;
    currencies: WalletCurrency[];
  };
  cashFlow: {
    total: number;
    data: CashFlowData[];
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveWalletType(wallet: Wallet): WalletCurrency['type'] {
  const t = String(wallet.walletType ?? '').toUpperCase();
  if (t === 'MOMO') return 'momo';
  if (t === 'ZALOPAY') return 'zalopay';
  if (t === 'CASH') return 'cash';
  return 'techcombank';
}

export function useDashboardData(cashflowFilter: 'monthly' | 'yearly' = 'yearly') {
  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: () => apiClient.getWallets(),
    staleTime: 60_000,
  });

  const savingsQuery = useQuery({
    queryKey: ['savings', 'SAVING'],
    queryFn: () => apiClient.getSavings('SAVING'),
    staleTime: 60_000,
  });

  const investmentsQuery = useQuery({
    queryKey: ['savings', 'INVESTMENT'],
    queryFn: () => apiClient.getSavings('INVESTMENT'),
    staleTime: 60_000,
  });

  const cashflowQuery = useQuery({
    queryKey: ['dashboard', 'cashflow', cashflowFilter],
    queryFn: async () => {
      const dashboard = await apiClient.getAnalyticsDashboard({ type: cashflowFilter });
      const trend = dashboard.trend ?? [];
      const data: CashFlowData[] = trend.map((item) => ({
        month: item.month,
        cashflow: toNumber(item.income),
        outflow: Math.abs(toNumber(item.expense)),
        inflow: -Math.abs(toNumber(item.expense)),
      }));
      return {
        total: data.reduce((sum, item) => sum + item.cashflow, 0),
        data,
      };
    },
    staleTime: 30_000,
  });

  const wallets = walletsQuery.data ?? [];
  const savings = savingsQuery.data ?? [];
  const investments = investmentsQuery.data ?? [];

  const data = useMemo<DashboardData>(() => {
    const totalBalance = wallets.reduce((sum, w) => sum + toNumber(w.balance), 0);
    const totalSavings = savings.reduce((sum, s) => sum + toNumber(s.currentAmount), 0);
    const totalInvestment = investments.reduce((sum, i) => sum + toNumber(i.currentAmount), 0);

    return {
      overview: {
        balance: {
          title: 'Số dư của tôi',
          subtitle: 'Tổng quan ví & Chi tiêu',
          amount: totalBalance,
          growth: 0,
          isPositive: totalBalance >= 0,
          isPrimary: true,
        },
        savings: {
          title: 'Tài khoản tiết kiệm',
          subtitle: 'Tiết kiệm tăng trưởng đều',
          amount: totalSavings,
          growth: 0,
          isPositive: totalSavings >= 0,
        },
        investment: {
          title: 'Danh mục đầu tư',
          subtitle: 'Theo dõi tăng trưởng tài sản',
          amount: totalInvestment,
          growth: 0,
          isPositive: totalInvestment >= 0,
        },
      },
      wallet: {
        exchangeRate:
          wallets.length > 0
            ? `Đã đồng bộ ${wallets.length} ví`
            : 'Bạn chưa có ví nào trong hệ thống',
        currencies: wallets.map((w) => ({
          id: w.id,
          name: w.walletName,
          type: resolveWalletType(w),
          amount: toNumber(w.balance),
          limit: 'Không giới hạn',
          status: w.status === 1 ? 'Hoạt động' : 'Tạm khóa',
        })),
      },
      cashFlow: cashflowQuery.data ?? { total: 0, data: [] },
    };
  }, [wallets, savings, investments, cashflowQuery.data]);

  const isLoading =
    walletsQuery.isLoading ||
    savingsQuery.isLoading ||
    investmentsQuery.isLoading ||
    cashflowQuery.isLoading;

  const error =
    walletsQuery.error ?? savingsQuery.error ?? investmentsQuery.error ?? cashflowQuery.error ?? null;

  return { data, isLoading, error };
}
