import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CalendarRange,
  Info,
  PiggyBank,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet2,
} from 'lucide-react';
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard';
import { BudgetProgress } from '@/components/analytics/BudgetProgress';
import { CategoryChart } from '@/components/analytics/CategoryChart';
import { ForecastTrendChart } from '@/components/analytics/ForecastTrendChart';
import { IncomeExpenseComparisonChart } from '@/components/analytics/IncomeExpenseComparisonChart';
import { apiClient } from '@/lib/apiClient';
import { cn, formatCurrency } from '@/lib/utils';
import type { AnalyticsDashboardResponse, Wallet } from '@/types/finance';

type TimeRange = 'month' | 'quarter' | 'year' | 'custom';

const TIME_FILTERS: Array<{ value: TimeRange; label: string }> = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

function getCategoryIcon(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes('ăn') || normalized.includes('food') || normalized.includes('uống')) return '🍜';
  if (normalized.includes('di chuyển') || normalized.includes('xăng') || normalized.includes('xe')) return '🛵';
  if (normalized.includes('mua sắm') || normalized.includes('shopping')) return '🛍️';
  if (normalized.includes('giải trí') || normalized.includes('netflix') || normalized.includes('phim')) return '🎬';
  if (normalized.includes('nhà') || normalized.includes('thuê')) return '🏠';
  if (normalized.includes('điện') || normalized.includes('nước') || normalized.includes('hóa đơn')) return '💡';
  if (normalized.includes('lương') || normalized.includes('thu nhập')) return '💼';
  return '💳';
}

function buildFallbackComparison() {
  return Array.from({ length: 5 }, (_, index) => ({
    label: `Tuần ${index + 1}`,
    income: 0,
    expense: 0,
  }));
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 xl:col-span-2" />
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-[340px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-[340px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function EmptyListState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {message}
    </div>
  );
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value?: string) {
  if (!value) return '--';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getDefaultCustomRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);

  return {
    from: formatDateInput(start),
    to: formatDateInput(end),
  };
}

function buildAiQuestion(periodLabel: string, walletLabel: string) {
  return `Dựa trên dữ liệu tài chính cá nhân của tôi trong ${periodLabel} cho ${walletLabel}, hãy phân tích ngắn gọn sức khỏe tài chính hiện tại. Nêu 1 insight quan trọng nhất, 1 nguyên nhân chính dựa trên số liệu đang có và 1-2 hành động cụ thể trong 30 ngày tới. Chỉ trả lời trong phạm vi dữ liệu tài chính cá nhân của tôi.`;
}

function isGenericAiFallback(answer: string) {
  const normalized = answer.trim().toLowerCase();

  return normalized.includes('mình là trợ lý tài chính fin')
    && normalized.includes('quản lý tiền bạc và đầu tư');
}

function isPlaceholderAiInsight(answer: string) {
  const normalized = answer.trim().toLowerCase();

  return normalized.includes('backend gửi thêm')
    || normalized.includes('dữ liệu tài chính đã tổng hợp')
    || normalized.includes('analytics-service');
}

export const Analytics = () => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [customDateDraft, setCustomDateDraft] = useState(getDefaultCustomRange);
  const [appliedCustomRange, setAppliedCustomRange] = useState(getDefaultCustomRange);
  const [openMetricInfo, setOpenMetricInfo] = useState<string | null>(null);

  const activeWalletId = selectedWallet === 'all' ? undefined : selectedWallet;
  const effectiveFrom = selectedRange === 'custom' ? appliedCustomRange.from : undefined;
  const effectiveTo = selectedRange === 'custom' ? appliedCustomRange.to : undefined;
  const isCustomRangeInvalid =
    selectedRange === 'custom' &&
    Boolean(customDateDraft.from) &&
    Boolean(customDateDraft.to) &&
    customDateDraft.from > customDateDraft.to;

  const { data: wallets = [] } = useQuery<Wallet[]>({
    queryKey: ['wallets', 'analytics-filter'],
    queryFn: () => apiClient.getWallets(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<AnalyticsDashboardResponse>({
    queryKey: ['analytics-dashboard-live', selectedRange, activeWalletId ?? 'all', effectiveFrom ?? 'na', effectiveTo ?? 'na'],
    queryFn: () =>
      apiClient.getAnalyticsDashboard({
        range: selectedRange,
        walletId: activeWalletId,
        from: effectiveFrom,
        to: effectiveTo,
      }),
    staleTime: 60 * 1000,
  });

  const walletOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả ví' },
      ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.walletName })),
    ],
    [wallets]
  );

  const walletLabel = walletOptions.find((item) => item.value === selectedWallet)?.label ?? 'Tất cả ví';
  const periodLabel = data?.period?.label ?? (
    selectedRange === 'custom'
      ? `${formatDisplayDate(appliedCustomRange.from)} - ${formatDisplayDate(appliedCustomRange.to)}`
      : TIME_FILTERS.find((item) => item.value === selectedRange)?.label ?? 'Kỳ hiện tại'
  );

  const summary = {
    totalIncome: data?.summary?.totalIncome ?? 0,
    totalExpense: data?.summary?.totalExpense ?? 0,
    netIncome: data?.summary?.net ?? 0,
    savingsRate: data?.kpis?.savingsRate ?? data?.insights?.savingsRate ?? 0,
    dailyAverage: data?.kpis?.dailyAverageExpense ?? data?.insights?.dailyAverageExpense ?? 0,
  };

  const {
    data: aiInsightResult,
    isFetching: isAiFetching,
  } = useQuery({
    queryKey: [
      'analytics-ai-insight',
      selectedRange,
      activeWalletId ?? 'all',
      effectiveFrom ?? 'na',
      effectiveTo ?? 'na',
      summary.totalIncome,
      summary.totalExpense,
      summary.netIncome,
    ],
    enabled: Boolean(data),
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: () =>
      apiClient.askAI({
        question: buildAiQuestion(periodLabel, walletLabel),
        useLlm: true,
        walletId: activeWalletId,
        range: selectedRange,
        from: effectiveFrom,
        to: effectiveTo,
        context: {
          period: data?.period,
          summary: data?.summary,
          kpis: data?.kpis,
          breakdown: data?.breakdown?.slice(0, 6),
          comparison: data?.comparison?.slice(0, 6),
          budgetProgress: data?.budgetProgress?.slice(0, 5),
          topTransactions: data?.topTransactions?.slice(0, 5),
          subscriptions: data?.subscriptions?.slice(0, 5),
        },
      }),
  });

  const comparisonData = useMemo(() => {
    const liveData = data?.comparison ?? [];
    if (liveData.length > 0) return liveData;

    const fromTrend = (data?.trend ?? []).map((item) => ({
      label: item.month,
      income: item.income,
      expense: item.expense,
    }));

    return fromTrend.length > 0 ? fromTrend : buildFallbackComparison();
  }, [data]);

  const categoryData = useMemo(
    () =>
      (data?.breakdown ?? []).slice(0, 5).map((item) => ({
        icon: getCategoryIcon(item.name),
        name: item.name,
        value: item.value,
        color: item.color ?? '#14b8a6',
      })),
    [data]
  );

  const budgetData = useMemo(() => {
    if ((data?.budgetProgress ?? []).length > 0) {
      return data?.budgetProgress ?? [];
    }

    return (data?.breakdown ?? []).slice(0, 4).map((item) => {
      const limit = Math.max(item.value, Math.ceil(item.value * 1.15));
      return {
        category: item.name,
        spent: item.value,
        limit,
        remaining: Math.max(limit - item.value, 0),
        percent: limit > 0 ? Math.round((item.value / limit) * 100) : 0,
      };
    });
  }, [data]);

  const trendData = useMemo(() => {
    if ((data?.forecast ?? []).length > 0) {
      return data?.forecast ?? [];
    }

    return (data?.trend ?? []).slice(-6).map((item) => ({
      label: item.month,
      actual: item.net,
    }));
  }, [data]);

  const topTransactions = data?.topTransactions ?? [];
  const subscriptions = data?.subscriptions ?? [];
  const recurringSpend = data?.kpis?.recurringSpend ?? subscriptions.reduce((sum, item) => sum + item.amount, 0);
  const totalCategorySpend = categoryData.reduce((sum, item) => sum + item.value, 0);
  const riskiestBudget = budgetData[0];
  const insights = data?.insights;
  const aiInsightText = (aiInsightResult?.answer ?? '').trim();
  const shouldUseAiInsight = Boolean(aiInsightText)
    && !isGenericAiFallback(aiInsightText)
    && !isPlaceholderAiInsight(aiInsightText);
  const aiHeadline = shouldUseAiInsight
    ? 'Nhận định cá nhân hóa từ AI cho kỳ hiện tại'
    : insights?.headline ?? 'Hệ thống đang tổng hợp insight từ dữ liệu hiện tại.';
  const aiMessage = shouldUseAiInsight
    ? aiInsightText
    : insights?.message || 'Dữ liệu đang được phân tích theo ví và khoảng thời gian bạn đã chọn.';
  const aiRecommendation = insights?.recommendation ?? 'Tiếp tục theo dõi dòng tiền và tối ưu nhóm chi lớn nhất để cải thiện tỷ lệ tiết kiệm.';
  const aiBadge = isAiFetching
    ? 'Gemini đang phân tích...'
    : shouldUseAiInsight && aiInsightResult?.llmUsed
      ? 'Gemini Live'
      : shouldUseAiInsight
        ? 'AI Service'
        : 'Live Insight';
  const estimatedSavedAmount = Math.max(0, Math.round((summary.totalIncome * summary.savingsRate) / 100));
  const metricCards = [
    {
      label: 'Thu nhập ròng',
      value: summary.netIncome,
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      details: [
        `Cơ sở tính toán: Thu nhập ròng = Tổng thu nhập - Tổng chi tiêu trong kỳ.`,
        `Tổng thu nhập ghi nhận: ${formatCurrency(summary.totalIncome)}.`,
        `Tổng chi tiêu ghi nhận: ${formatCurrency(summary.totalExpense)}.`,
        `Giá trị thu nhập ròng hiện tại: ${formatCurrency(summary.netIncome)}.`,
      ],
    },
    {
      label: 'Chi tiêu kỳ này',
      value: summary.totalExpense,
      icon: <TrendingDown className="h-4 w-4 text-rose-600" />,
      details: [
        `Phạm vi tổng hợp: toàn bộ giao dịch chi tiêu thuộc ${periodLabel.toLowerCase()}.`,
        `Số giao dịch được đưa vào tính toán: ${data?.kpis?.transactionCount ?? topTransactions.length}.`,
        `Chi định kỳ đang hoạt động: ${formatCurrency(recurringSpend)}.`,
        `Tổng chi tiêu ghi nhận trong kỳ: ${formatCurrency(summary.totalExpense)}.`,
      ],
    },
    {
      label: 'Tỷ lệ tiết kiệm',
      value: summary.savingsRate,
      icon: <PiggyBank className="h-4 w-4 text-emerald-600" />,
      isPercent: true,
      details: [
        `Cơ sở tính toán: phần tiền giữ lại hoặc chuyển ròng vào quỹ tiết kiệm trên tổng thu nhập.`,
        `Tổng thu nhập ghi nhận: ${formatCurrency(summary.totalIncome)}.`,
        `Phần giá trị được xem là tiết kiệm: ${formatCurrency(estimatedSavedAmount)}.`,
        `Tỷ lệ tiết kiệm hiện tại: ${Number(summary.savingsRate).toFixed(1)}%.`,
      ],
    },
  ] as const;

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Không tải được dữ liệu phân tích tài chính
        </div>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300/90">{error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/80 md:px-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Trung tâm phân tích chuyên sâu • Live API
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                Phân tích tài chính chuyên sâu
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {periodLabel} • {walletLabel} • Dữ liệu đồng bộ theo giao dịch thực tế từ backend.
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px_auto] xl:items-center">
              <div className="flex flex-nowrap gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
                {TIME_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelectedRange(item.value)}
                    className={cn(
                      'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      selectedRange === item.value
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:text-emerald-300 dark:ring-emerald-900/50'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Wallet2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <select
                  value={selectedWallet}
                  onChange={(event) => setSelectedWallet(event.target.value)}
                  className="h-full w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                >
                  {walletOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                {isFetching ? 'Đang cập nhật' : 'Làm mới'}
              </button>
            </div>
          </div>

          {selectedRange === 'custom' ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Từ ngày</span>
                  <input
                    type="date"
                    value={customDateDraft.from}
                    onChange={(event) => setCustomDateDraft((prev) => ({ ...prev, from: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Đến ngày</span>
                  <input
                    type="date"
                    value={customDateDraft.to}
                    onChange={(event) => setCustomDateDraft((prev) => ({ ...prev, to: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (!isCustomRangeInvalid) {
                      setAppliedCustomRange(customDateDraft);
                    }
                  }}
                  disabled={isCustomRangeInvalid || !customDateDraft.from || !customDateDraft.to}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  Áp dụng khoảng ngày
                </button>
              </div>

              <p className={cn('mt-2 text-xs', isCustomRangeInvalid ? 'text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400')}>
                {isCustomRangeInvalid
                  ? 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.'
                  : `Khoảng đang áp dụng: ${formatDisplayDate(appliedCustomRange.from)} - ${formatDisplayDate(appliedCustomRange.to)}`}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <AnalyticsCard
          title="AI Financial Insight"
          description={`${periodLabel} • ${walletLabel}`}
          badge={aiBadge}
          className="xl:col-span-2 bg-gradient-to-br from-emerald-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
          headerRight={
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white dark:bg-slate-800">
              <BrainCircuit className="mr-1 inline h-3 w-3" />
              {aiInsightResult?.llmUsed ? 'Gemini' : 'AI Insight'}
            </span>
          }
        >
          <div className="space-y-3">
            <div
              className={cn(
                'rounded-2xl border bg-white/80 p-4 dark:bg-slate-900/80',
                insights?.severity === 'warning'
                  ? 'border-rose-100 dark:border-rose-900/50'
                  : insights?.severity === 'good'
                    ? 'border-emerald-100 dark:border-emerald-900/50'
                    : 'border-slate-100 dark:border-slate-700'
              )}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {insights?.severity === 'warning' ? '⚠️' : insights?.severity === 'good' ? '✅' : '📊'}{' '}
                {aiHeadline}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {isAiFetching ? 'Gemini đang đọc dữ liệu thực tế để sinh insight cá nhân hóa...' : aiMessage}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4 dark:border-emerald-900/50 dark:bg-slate-900/80">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">💡 {aiRecommendation}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Danh mục rủi ro: {insights?.riskiestCategory ?? riskiestBudget?.category ?? 'Chưa xác định'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Chi định kỳ: {formatCurrency(recurringSpend)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Giao dịch kỳ này: {data?.kpis?.transactionCount ?? topTransactions.length}
                </span>
              </div>
            </div>
          </div>
        </AnalyticsCard>

        <div className="grid gap-3">
          {metricCards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                  <button
                    type="button"
                    onClick={() => setOpenMetricInfo((current) => current === item.label ? null : item.label)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-emerald-900/50 dark:hover:text-emerald-300"
                    aria-label={`Giải thích cách tính ${item.label}`}
                    aria-expanded={openMetricInfo === item.label}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {'isPercent' in item && item.isPercent ? `${Number(item.value).toFixed(1)}%` : formatCurrency(Number(item.value))}
              </p>
              {openMetricInfo === item.label ? (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs text-slate-600 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-300">
                  {item.details.map((detail) => (
                    <p key={detail} className="leading-5">
                      {detail}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <AnalyticsCard
          title="So sánh Thu - Chi"
          description="Quan sát nhanh giai đoạn nào chi tiêu đang bám sát hoặc vượt thu nhập."
          badge="Live comparison"
          className="xl:col-span-3"
        >
          <IncomeExpenseComparisonChart data={comparisonData} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Phân tích theo Danh mục"
          description="Tỷ trọng chi tiêu theo nhóm chính trong kỳ hiện tại."
          badge={`${categoryData.length} nhóm`}
          className="xl:col-span-2"
        >
          <CategoryChart total={totalCategorySpend} categories={categoryData} />
        </AnalyticsCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AnalyticsCard
          title="Theo dõi Ngân sách"
          description="Progress bar chuyển đỏ khi tiến sát ngưỡng ngân sách đề xuất."
          badge="Budget tracking"
        >
          {budgetData.length > 0 ? <BudgetProgress items={budgetData} /> : <EmptyListState message="Chưa có đủ dữ liệu để gợi ý ngân sách theo danh mục." />}
        </AnalyticsCard>

        <AnalyticsCard
          title="Dự báo & Trend số dư"
          description="Đường liền là số dư thực tế theo giao dịch hiện có, đường đứt là dự báo cuối kỳ."
          badge="Forecast"
        >
          <ForecastTrendChart data={trendData} />
        </AnalyticsCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AnalyticsCard
          title="Top Giao dịch"
          description="Những giao dịch lớn nhất trong kỳ giúp bạn nhận diện điểm rơi dòng tiền."
          badge={`Top ${topTransactions.length || 0}`}
        >
          <div className="space-y-3">
            {topTransactions.length > 0 ? (
              topTransactions.map((item) => (
                <div key={`${item.id}-${item.date}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-slate-900">
                      {getCategoryIcon(item.category)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.merchant}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.category} • {item.date}</p>
                    </div>
                  </div>

                  <span className={cn('text-sm font-bold', item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {item.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                  </span>
                </div>
              ))
            ) : (
              <EmptyListState message="Chưa có giao dịch nổi bật trong kỳ đã chọn." />
            )}
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Chi tiêu Định kỳ"
          description="Tổng các khoản cố định được lấy từ recurring rules thực tế."
          badge="Subscriptions"
          headerRight={
            <div className="rounded-xl bg-rose-50 px-3 py-1.5 text-right dark:bg-rose-950/30">
              <p className="text-[11px] font-medium text-rose-500 dark:text-rose-300">Tổng cố định / kỳ</p>
              <p className="text-sm font-bold text-rose-600">{formatCurrency(recurringSpend)}</p>
            </div>
          }
        >
          <div className="space-y-3">
            {subscriptions.length > 0 ? (
              subscriptions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-slate-900">
                      {getCategoryIcon(item.name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.date}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyListState message="Bạn chưa có khoản chi định kỳ nào để phân tích." />
            )}

            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ArrowUpRight className="mr-2 inline h-4 w-4" />
              Gợi ý tự động: ưu tiên tối ưu các khoản định kỳ ít sử dụng để tăng nhanh tỷ lệ tiết kiệm.
            </div>
          </div>
        </AnalyticsCard>
      </section>
    </motion.div>
  );
};

export default Analytics;
