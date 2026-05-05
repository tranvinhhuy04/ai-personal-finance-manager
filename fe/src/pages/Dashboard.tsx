import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Overview } from '@/components/dashboard/Overview';
import { MyWallet } from '@/components/dashboard/MyWallet';
import { CashFlow } from '@/components/dashboard/CashFlow';
import { CreateWalletModal } from '@/components/dashboard/CreateWalletModal';
import { apiClient } from '@/lib/apiClient';
import { cn, formatVND } from '@/lib/utils';
import type { DashboardData, WalletCurrency } from '@/hooks/useDashboardData';
import type { Wallet } from '@/types/finance';
import { useSavingsMetrics, useInvestmentMetrics } from '@/hooks/usePerformanceMetrics';
import { useSavingsGrowth } from '@/hooks/useSavingsGrowth';

const DEFAULT_DASHBOARD_DATA: DashboardData = {
  overview: {
    balance: {
      title: 'Số dư của tôi',
      subtitle: 'Tổng quan ví & Chi tiêu',
      amount: 0,
      growth: 0,
      isPositive: true,
      isPrimary: true,
    },
    savings: {
      title: 'Tài khoản tiết kiệm',
      subtitle: 'Tiết kiệm tăng trưởng đều',
      amount: 0,
      growth: 0,
      isPositive: true,
    },
    investment: {
      title: 'Danh mục đầu tư',
      subtitle: 'Theo dõi tăng trưởng tài sản',
      amount: 0,
      growth: 0,
      isPositive: true,
    },
  },
  wallet: {
    exchangeRate: 'Đang đồng bộ dữ liệu ví...',
    currencies: [],
  },
  cashFlow: {
    total: 0,
    data: [],
  },
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapWalletType(wallet: Wallet): WalletCurrency['type'] {
  const walletType = String(wallet.walletType ?? '').toLowerCase();
  const walletName = String(wallet.walletName ?? '').toLowerCase();

  if (walletType.includes('momo') || walletName.includes('momo')) {
    return 'momo';
  }

  if (walletType.includes('zalo') || walletName.includes('zalopay') || walletName.includes('zalo pay')) {
    return 'zalopay';
  }

  if (walletType.includes('cash') || walletName.includes('tiền mặt') || walletName.includes('tien mat')) {
    return 'cash';
  }

  return 'techcombank';
}

function mapWalletStatus(status: number): WalletCurrency['status'] {
  return status === 1 ? 'Hoạt động' : 'Tạm khóa';
}

async function fetchOverview(walletsPromise?: Promise<Wallet[]>): Promise<DashboardData['overview']> {
  const [wallets, savings, investments] = await Promise.all([
    walletsPromise ?? apiClient.getWallets(),
    apiClient.getSavings('SAVING'),
    apiClient.getSavings('INVESTMENT'),
  ]);

  const totalWalletBalance = wallets.reduce((sum, wallet) => sum + toNumber(wallet.balance), 0);
  const totalSavings = savings
    .filter((item) => item.status === 'ACTIVE')
    .reduce((sum, item) => sum + toNumber(item.currentAmount), 0);
  const totalInvestment = investments
    .filter((item) => item.status === 'ACTIVE')
    .reduce((sum, item) => sum + toNumber(item.currentAmount), 0);

  return {
    balance: {
      ...DEFAULT_DASHBOARD_DATA.overview.balance,
      amount: totalWalletBalance,
      isPositive: totalWalletBalance >= 0,
    },
    savings: {
      ...DEFAULT_DASHBOARD_DATA.overview.savings,
      amount: totalSavings,
      isPositive: totalSavings >= 0,
    },
    investment: {
      ...DEFAULT_DASHBOARD_DATA.overview.investment,
      amount: totalInvestment,
      isPositive: totalInvestment >= 0,
    },
  };
}

async function fetchWallets(walletsPromise?: Promise<Wallet[]>): Promise<DashboardData['wallet']> {
  const wallets = await (walletsPromise ?? apiClient.getWallets());

  return {
    exchangeRate:
      wallets.length > 0
        ? `Đã đồng bộ ${wallets.length} ví từ backend`
        : 'Bạn chưa có ví nào trong hệ thống',
    currencies: wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.walletName,
      type: mapWalletType(wallet),
      amount: toNumber(wallet.balance),
      limit: 'Không giới hạn',
      status: mapWalletStatus(wallet.status),
    })),
  };
}

async function fetchCashflow(filter: 'monthly' | 'yearly' = 'yearly'): Promise<DashboardData['cashFlow']> {
  const dashboard = await apiClient.getAnalyticsDashboard({ type: filter });
  const trend = dashboard.trend ?? [];

  const data = trend.map((item) => ({
    month: item.month,
    cashflow: toNumber(item.income),
    outflow: Math.abs(toNumber(item.expense)),
    inflow: -Math.abs(toNumber(item.expense)),
  }));

  return {
    total: data.reduce((sum, item) => sum + item.cashflow, 0),
    data,
  };
}

function DashboardSkeleton() {
  return (
    <>
      <section className="mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="h-8 w-40 animate-pulse rounded bg-slate-200 text-transparent">Tổng quan</div>
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200 text-transparent">Dữ liệu tổng thể</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200 text-transparent">.</div>
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200 text-transparent">.</div>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'p-6 rounded-3xl flex flex-col justify-between h-full',
                index === 0
                  ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white text-gray-900 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-gray-100',
              )}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-2xl', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                    <div>
                      <div className={cn('h-4 w-24 rounded', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                      <div className={cn('mt-2 h-3 w-28 rounded', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                    </div>
                  </div>
                  <div className={cn('h-8 w-8 rounded-full', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                </div>

                <div className="flex items-end gap-3 mb-6">
                  <div className={cn('h-9 w-36 rounded', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                  <div className={cn('h-6 w-14 rounded-full', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                </div>
              </div>

              <div className={cn('pt-4 border-t flex items-center justify-between', index === 0 ? 'border-white/20' : 'border-gray-100')}>
                <div className={cn('h-4 w-24 rounded', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
                <div className={cn('h-4 w-4 rounded', index === 0 ? 'bg-white/20' : 'bg-slate-200 animate-pulse')} />
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 w-24 animate-pulse rounded bg-slate-200 text-transparent">Ví của tôi</div>
              <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-200 text-transparent">Tỷ giá</div>
            </div>
            <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-200 text-transparent">Thêm mới</div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="p-5 rounded-2xl border shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] bg-white border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
                    <div>
                      <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                      <div className="mt-2 h-2 w-16 rounded bg-slate-200 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-slate-200 animate-pulse" />
                </div>

                <div className="mb-4">
                  <div className="h-7 w-24 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-2 h-3 w-20 rounded bg-slate-200 animate-pulse" />
                </div>

                <div className="h-6 w-16 rounded-full bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] min-h-[360px] min-w-0 flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200 text-transparent">Dòng tiền</div>
              <div className="mt-2 h-8 w-36 animate-pulse rounded bg-slate-200 text-transparent">0 đ</div>
            </div>
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200 text-transparent">Hàng năm</div>
          </div>

          <div className="h-72 w-full min-w-0 flex items-end justify-between gap-3 px-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full rounded-t-xl bg-slate-200 animate-pulse"
                  style={{ height: `${120 + ((index % 3) + 1) * 28}px` }}
                />
                <div className="h-3 w-8 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export const Dashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cashflowFilter, setCashflowFilter] = useState<'monthly' | 'yearly'>('yearly');
  const queryClient = useQueryClient();

  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: () => apiClient.getWallets(),
    staleTime: 60 * 1000,
  });

  const savingsQuery = useQuery({
    queryKey: ['savings', 'SAVING'],
    queryFn: () => apiClient.getSavings('SAVING'),
    staleTime: 60 * 1000,
  });

  const investmentsQuery = useQuery({
    queryKey: ['savings', 'INVESTMENT'],
    queryFn: () => apiClient.getSavings('INVESTMENT'),
    staleTime: 60 * 1000,
  });

  const cashflowQuery = useQuery({
    queryKey: ['dashboard', 'cashflow', cashflowFilter],
    queryFn: () => fetchCashflow(cashflowFilter),
    staleTime: 30 * 1000,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'savings-history'],
    queryFn: () => apiClient.getTransactions(200, 0),
    staleTime: 5 * 60 * 1000,
  });

  const overviewData = useMemo<DashboardData['overview']>(() => {
    const wallets = walletsQuery.data ?? [];
    const savings = savingsQuery.data ?? [];
    const investments = investmentsQuery.data ?? [];

    const totalWalletBalance = wallets.reduce((sum, wallet) => sum + toNumber(wallet.balance), 0);
    const totalSavings = savings.reduce((sum, item) => sum + toNumber(item.currentAmount), 0);
    const totalInvestment = investments.reduce((sum, item) => sum + toNumber(item.currentAmount), 0);

    return {
      balance: {
        ...DEFAULT_DASHBOARD_DATA.overview.balance,
        amount: totalWalletBalance,
        isPositive: totalWalletBalance >= 0,
      },
      savings: {
        ...DEFAULT_DASHBOARD_DATA.overview.savings,
        amount: totalSavings,
        isPositive: totalSavings >= 0,
      },
      investment: {
        ...DEFAULT_DASHBOARD_DATA.overview.investment,
        amount: totalInvestment,
        isPositive: totalInvestment >= 0,
      },
    };
  }, [investmentsQuery.data, savingsQuery.data, walletsQuery.data]);

  const walletsData = useMemo<DashboardData['wallet']>(() => {
    const wallets = walletsQuery.data ?? [];

    return {
      exchangeRate:
        wallets.length > 0
          ? `Đã đồng bộ ${wallets.length} ví từ backend`
          : 'Bạn chưa có ví nào trong hệ thống',
      currencies: wallets.map((wallet) => ({
        id: wallet.id,
        name: wallet.walletName,
        type: mapWalletType(wallet),
        amount: toNumber(wallet.balance),
        limit: 'Không giới hạn',
        status: mapWalletStatus(wallet.status),
      })),
    };
  }, [walletsQuery.data]);

  const savingsGrowth = useSavingsGrowth(savingsQuery.data ?? [], transactionsQuery.data ?? []);
  const savingsMetrics = useSavingsMetrics(
    savingsQuery.data ?? [],
    savingsGrowth.hasEnoughData ? savingsGrowth.cagr : undefined,
  );
  const investmentMetrics = useInvestmentMetrics(investmentsQuery.data ?? [], savingsMetrics.totalCurrent);

  const cashflowData = cashflowQuery.data ?? DEFAULT_DASHBOARD_DATA.cashFlow;
  const isLoading =
    walletsQuery.isLoading ||
    savingsQuery.isLoading ||
    investmentsQuery.isLoading ||
    cashflowQuery.isLoading;

  const handleWalletCreateSuccess = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['wallets'] });
  }, [queryClient]);

  const handleCashflowRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'cashflow', cashflowFilter] });
  }, [queryClient, cashflowFilter]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <Overview
        data={overviewData}
        savingsMetrics={savingsMetrics}
        investmentMetrics={investmentMetrics}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <MyWallet
          data={walletsData}
          rawWallets={walletsQuery.data ?? []}
          onAddWallet={() => setIsCreateModalOpen(true)}
          onWalletChanged={handleWalletCreateSuccess}
        />
        <CashFlow
          data={cashflowData}
          cashflowFilter={cashflowFilter}
          onCashflowFilterChange={setCashflowFilter}
          onRefresh={handleCashflowRefresh}
          isRefreshing={cashflowQuery.isFetching}
        />
      </div>
      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleWalletCreateSuccess}
      />
    </>
  );
};

export default Dashboard;
