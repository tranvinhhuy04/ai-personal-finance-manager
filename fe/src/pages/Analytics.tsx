import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Landmark, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type { AnalyticsDashboardResponse, Wallet } from '@/types/finance';
import { cn, formatCompactNumber, formatCurrency } from '@/lib/utils';

const FALLBACK_COLORS = ['#10b981', '#f97316', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6', '#84cc16'];

const SUMMARY_STYLES = {
  income: {
    card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50',
    orb: 'from-emerald-400/30 via-emerald-300/10 to-transparent',
    iconWrap: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-200/70 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.7)]',
    badge: 'text-emerald-700',
  },
  expense: {
    card: 'border-orange-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50',
    orb: 'from-orange-400/30 via-amber-300/10 to-transparent',
    iconWrap: 'bg-orange-500/10 text-orange-700 ring-1 ring-orange-200/70 shadow-[0_10px_30px_-12px_rgba(249,115,22,0.65)]',
    badge: 'text-orange-700',
  },
  net: {
    card: 'border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-indigo-50',
    orb: 'from-sky-400/30 via-sky-300/10 to-transparent',
    iconWrap: 'bg-sky-500/10 text-sky-700 ring-1 ring-sky-200/70 shadow-[0_10px_30px_-12px_rgba(14,165,233,0.65)]',
    badge: 'text-sky-700',
  },
} as const;

const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <p className="mb-1 text-xs font-medium text-slate-500">{label || payload[0]?.name}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={`${entry.dataKey}-${entry.name}`} className="flex items-center justify-between gap-4 text-xs">
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.name}
            </span>
            <span className="font-semibold text-slate-900">{formatCurrency(Number(entry.value) || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-[420px] animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-[420px] animate-pulse rounded-3xl bg-slate-200" />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'income' | 'expense' | 'net';
  icon: React.ReactNode;
}) {
  const theme = SUMMARY_STYLES[tone];
  const isZero = Math.round(value) === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'relative overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]',
        theme.card,
      )}
    >
      <div className={cn('pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl', theme.orb)} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-3 text-xl font-bold tracking-tight text-slate-900 tabular-nums md:text-2xl">{formatCurrency(value)}</p>
          <p className={cn('mt-1 text-xs font-medium', isZero ? 'text-slate-400' : theme.badge)}>
            {isZero ? 'Chưa phát sinh trong kỳ' : 'Dữ liệu cập nhật theo bộ lọc hiện tại'}
          </p>
        </div>

        <div className={cn('relative rounded-2xl p-3 backdrop-blur-sm', theme.iconWrap)}>
          <span className="absolute inset-0 rounded-2xl bg-white/30 opacity-60" />
          <span className="relative">{icon}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-w-0 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">Dữ liệu thực</span>
      </div>
      {children}
    </motion.div>
  );
}

export const Analytics = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [activeSlice, setActiveSlice] = useState(0);

  const { data, isLoading, isError, error } = useQuery<AnalyticsDashboardResponse>({
    queryKey: ['analytics-dashboard', selectedMonth || 'all', selectedWallet || 'all'],
    queryFn: () =>
      apiClient.getAnalyticsDashboard({
        month: selectedMonth || undefined,
        walletId: selectedWallet || undefined,
      }),
    staleTime: 60 * 1000,
  });

  const { data: wallets = [] } = useQuery<Wallet[]>({
    queryKey: ['wallet-options'],
    queryFn: () => apiClient.getWallets(),
    staleTime: 5 * 60 * 1000,
  });

  const monthOptions = useMemo(() => {
    return (data?.trend ?? []).map((point) => ({
      value: point.monthKey,
      label: point.month,
    }));
  }, [data]);

  const categoryData = useMemo(() => {
    return (data?.breakdown ?? []).map((item, index) => ({
      ...item,
      color: item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));
  }, [data]);

  const totalCategoryAmount = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + Number(item.value || 0), 0);
  }, [categoryData]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Không tải được dữ liệu phân tích tài chính
        </div>
        <p className="mt-2 text-sm text-red-600">{error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}</p>
      </div>
    );
  }

  const summary = data?.summary ?? { totalIncome: 0, totalExpense: 0, net: 0 };
  const trend = data?.trend ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Bảng điều khiển phân tích nâng cao
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Phân tích tài chính</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi xu hướng thu chi và cơ cấu danh mục.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            <option value="">Tất cả các tháng</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            value={selectedWallet}
            onChange={(event) => setSelectedWallet(event.target.value)}
          >
            <option value="">Tất cả các ví</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.walletName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Tổng thu nhập"
          value={summary.totalIncome}
          tone="income"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <SummaryCard
          label="Tổng chi tiêu"
          value={summary.totalExpense}
          tone="expense"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <SummaryCard
          label="Dòng tiền ròng"
          value={summary.net}
          tone="net"
          icon={<Landmark className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Xu hướng thu chi & dòng tiền ròng">
          <div className="h-[380px] w-full min-w-0" style={{ width: '100%', minHeight: 340 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
              <ComposedChart data={trend} margin={{ top: 10, right: 12, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="incomeBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fdba74" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="netLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                  <filter id="softLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  minTickGap={18}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  width={84}
                  tickFormatter={(value) => formatCompactNumber(Number(value))}
                />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar
                  dataKey="income"
                  name="Thu nhập"
                  stackId="flow"
                  fill="url(#incomeBarGradient)"
                  radius={[10, 10, 6, 6]}
                  barSize={22}
                  animationDuration={900}
                />
                <Bar
                  dataKey="expense"
                  name="Chi tiêu"
                  stackId="flow"
                  fill="url(#expenseBarGradient)"
                  radius={[10, 10, 6, 6]}
                  barSize={22}
                  animationDuration={1100}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Dòng tiền ròng"
                  stroke="url(#netLineGradient)"
                  strokeWidth={3}
                  filter="url(#softLineGlow)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cơ cấu chi tiêu theo danh mục">
          {categoryData.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="h-[360px] w-full min-w-0" style={{ width: '100%', minHeight: 320 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
                  <PieChart>
                    <defs>
                      {categoryData.map((entry, index) => (
                        <linearGradient key={entry.name} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={0.98} />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.65} />
                        </linearGradient>
                      ))}
                      <filter id="donutShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.12" />
                      </filter>
                    </defs>

                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={78}
                      outerRadius={118}
                      paddingAngle={4}
                      cx="50%"
                      cy="50%"
                      onMouseEnter={(_, index) => setActiveSlice(index)}
                      labelLine={false}
                      label={({ percent }) => (percent && percent >= 0.08 ? `${Math.round(percent * 100)}%` : '')}
                      filter="url(#donutShadow)"
                      animationDuration={1100}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={`url(#pieGradient-${index})`}
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth={activeSlice === index ? 4 : 2}
                          opacity={activeSlice === index ? 1 : 0.72}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CurrencyTooltip />} />
                    <text x="50%" y="46%" textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
                      Tổng chi tiêu
                    </text>
                    <text x="50%" y="54%" textAnchor="middle" className="fill-slate-900 text-[18px] font-bold">
                      {formatCurrency(totalCategoryAmount)}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {categoryData.map((item, index) => {
                  const percent = totalCategoryAmount > 0 ? (item.value / totalCategoryAmount) * 100 : 0;
                  return (
                    <button
                      key={`${item.name}-${index}`}
                      type="button"
                      onMouseEnter={() => setActiveSlice(index)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all',
                        activeSlice === index
                          ? 'border-slate-300 bg-slate-50 shadow-sm'
                          : 'border-transparent bg-slate-50/70 hover:border-slate-200 hover:bg-white',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-[340px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 text-sm text-slate-500">
              Chưa có dữ liệu chi tiêu trong kỳ đã chọn.
            </div>
          )}
        </ChartCard>
      </div>
    </motion.div>
  );
};

export default Analytics;
