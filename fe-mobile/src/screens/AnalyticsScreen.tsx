import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bot, BrainCircuit, CalendarRange, ChartPie, Info, PiggyBank, Sparkles, TrendingDown, TrendingUp, Wallet2 } from 'lucide-react-native';

import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SkeletonLoading } from '../components/SkeletonLoading';
import { financeApi } from '../api/finance';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { useCashflow } from '../hooks/useCashflow';
import { useWallets } from '../hooks/useWallets';
import type { TimeRange } from '../types/finance';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';

const RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: 'month', label: 'Tháng này' },
  { key: 'quarter', label: 'Quý này' },
  { key: 'year', label: 'Năm nay' },
];

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
    || normalized.includes('analytics-service')
    || normalized.includes('dữ liệu tài chính đã tổng hợp');
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className={`min-h-[44px] rounded-full px-4 py-2 items-center justify-center ${selected ? 'bg-emerald-600' : 'bg-slate-100'}`}>
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({
  title,
  value,
  icon,
  details,
  open,
  onToggle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  details: readonly string[];
  open: boolean;
  onToggle: () => void;
}) {

  return (
    <View className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-slate-500">{title}</Text>
          <Text className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</Text>
        </View>

        <View className="items-end gap-2">
          <View className="rounded-2xl bg-slate-100 p-2.5">{icon}</View>
          <Pressable
            onPress={onToggle}
            className="h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white"
            hitSlop={8}
          >
            <Info size={14} color="#64748b" />
          </Pressable>
        </View>
      </View>

      {open ? (
        <View className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/80 px-3.5 py-3">
          {details.map((detail) => (
            <Text key={detail} className="text-xs leading-5 text-slate-600">
              {detail}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function AnalyticsScreen() {
  const { preferences } = useAppPreferences();
  const [range, setRange] = useState<TimeRange>('month');
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(undefined);
  const [openMetricInfo, setOpenMetricInfo] = useState<string | null>(null);
  const { rawWallets } = useWallets();
  const { data, isLoading, isRefreshing, isDemoMode, errorMessage, refetch } = useCashflow(range, selectedWalletId);

  const trend = data?.comparison ?? [];
  const breakdown = data?.breakdown ?? [];
  const budgets = data?.budgetProgress ?? [];
  const topTransactions = data?.topTransactions ?? [];
  const subscriptions = data?.subscriptions ?? [];
  const topMax = Math.max(...trend.flatMap((item) => [item.income, item.expense]), 1);
  const totalExpense = data?.summary.totalExpense ?? 0;
  const topCategory = breakdown[0];
  const recurringSpend = data?.kpis?.recurringSpend ?? subscriptions.reduce((sum, item) => sum + item.amount, 0);
  const walletOptions = useMemo(
    () => [{ id: 'all', name: 'Tất cả ví' }, ...rawWallets.map((wallet) => ({ id: wallet.id, name: wallet.walletName }))],
    [rawWallets]
  );
  const walletLabel = walletOptions.find((wallet) => wallet.id === (selectedWalletId ?? 'all'))?.name ?? 'Tất cả ví';
  const periodLabel = data?.period?.label ?? RANGES.find((item) => item.key === range)?.label ?? 'Kỳ hiện tại';
  const estimatedSavedAmount = Math.max(0, Math.round(((data?.summary.totalIncome ?? 0) * (data?.kpis?.savingsRate ?? 0)) / 100));

  const {
    data: aiInsightResult,
    isFetching: isAiFetching,
  } = useQuery({
    queryKey: ['mobile-analytics-ai-insight', range, selectedWalletId ?? 'all', data?.summary.totalIncome ?? 0, data?.summary.totalExpense ?? 0],
    enabled: Boolean(data),
    staleTime: 60_000,
    retry: 1,
    queryFn: () =>
      financeApi.askAI({
        question: buildAiQuestion(periodLabel, walletLabel),
        useLlm: true,
        walletId: selectedWalletId,
        range,
        context: {
          period: data?.period,
          summary: data?.summary,
          kpis: data?.kpis,
          breakdown: breakdown.slice(0, 6),
          comparison: trend.slice(0, 6),
          budgetProgress: budgets.slice(0, 5),
          topTransactions: topTransactions.slice(0, 5),
          subscriptions: subscriptions.slice(0, 5),
        },
      }),
  });

  const aiInsightText = (aiInsightResult?.answer ?? '').trim();
  const shouldUseAiInsight = Boolean(aiInsightText)
    && !isGenericAiFallback(aiInsightText)
    && !isPlaceholderAiInsight(aiInsightText);
  const aiHeadline = shouldUseAiInsight
    ? 'Nhận định cá nhân hóa từ AI cho kỳ hiện tại'
    : data?.insights?.headline ?? 'Hệ thống đang tổng hợp insight từ dữ liệu hiện tại.';
  const aiMessage = shouldUseAiInsight
    ? aiInsightText
    : data?.insights?.message ?? 'Dữ liệu đang được phân tích theo ví và khoảng thời gian bạn đã chọn.';
  const aiRecommendation = data?.insights?.recommendation ?? 'Tiếp tục theo dõi nhóm chi lớn nhất và duy trì kỷ luật ngân sách theo tuần.';

  const metricCards = [
    {
      label: 'Thu nhập ròng',
      value: formatCurrency(data?.summary.net ?? 0),
      icon: <TrendingUp size={18} color="#059669" />,
      details: [
        `Cơ sở tính toán: Thu nhập ròng = Tổng thu nhập - Tổng chi tiêu trong kỳ.`,
        `Tổng thu nhập ghi nhận: ${formatCurrency(data?.summary.totalIncome ?? 0)}.`,
        `Tổng chi tiêu ghi nhận: ${formatCurrency(data?.summary.totalExpense ?? 0)}.`,
        `Giá trị thu nhập ròng hiện tại: ${formatCurrency(data?.summary.net ?? 0)}.`,
      ],
    },
    {
      label: 'Chi tiêu kỳ này',
      value: formatCurrency(data?.summary.totalExpense ?? 0),
      icon: <TrendingDown size={18} color="#e11d48" />,
      details: [
        `Phạm vi tổng hợp: toàn bộ giao dịch chi tiêu thuộc ${periodLabel.toLowerCase()}.`,
        `Số giao dịch được đưa vào tính toán: ${data?.kpis?.transactionCount ?? topTransactions.length}.`,
        `Chi định kỳ đang hoạt động: ${formatCurrency(recurringSpend)}.`,
        `Tổng chi tiêu ghi nhận trong kỳ: ${formatCurrency(data?.summary.totalExpense ?? 0)}.`,
      ],
    },
    {
      label: 'Tỷ lệ tiết kiệm',
      value: `${Number(data?.kpis?.savingsRate ?? 0).toFixed(1)}%`,
      icon: <PiggyBank size={18} color="#059669" />,
      details: [
        `Cơ sở tính toán: phần tiền giữ lại hoặc chuyển ròng vào quỹ tiết kiệm trên tổng thu nhập.`,
        `Tổng thu nhập ghi nhận: ${formatCurrency(data?.summary.totalIncome ?? 0)}.`,
        `Phần giá trị được xem là tiết kiệm: ${formatCurrency(estimatedSavedAmount)}.`,
        `Tỷ lệ tiết kiệm hiện tại: ${Number(data?.kpis?.savingsRate ?? 0).toFixed(1)}%.`,
      ],
    },
  ] as const;

  if (isLoading && !data) {
    return <SkeletonLoading />;
  }

  return (
    <View className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <ScreenHeader
        eyebrow="Live Analytics"
        title="Phân tích chuyên sâu"
        subtitle="Dữ liệu mobile đồng bộ trực tiếp từ analytics-service, cùng ngôn ngữ thiết kế với dashboard web hiện tại."
        rightSlot={
          <View className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Live API</Text>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} />}
      >
        {isDemoMode ? (
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-sm font-medium text-amber-800">Analytics đang dùng dữ liệu demo để bạn xem giao diện đầy đủ.</Text>
            {errorMessage ? <Text className="mt-1 text-xs text-amber-700">{errorMessage}</Text> : null}
          </View>
        ) : null}

        <SectionCard title="Bộ lọc phân tích" subtitle="Chọn khoảng thời gian và ví để xem báo cáo đúng theo bối cảnh sử dụng." className="mb-0">
          <View className="gap-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {RANGES.map((item) => (
                <FilterChip key={item.key} label={item.label} selected={range === item.key} onPress={() => setRange(item.key)} />
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {walletOptions.slice(0, 6).map((wallet) => (
                <FilterChip
                  key={wallet.id}
                  label={wallet.name}
                  selected={(selectedWalletId ?? 'all') === wallet.id}
                  onPress={() => setSelectedWalletId(wallet.id === 'all' ? undefined : wallet.id)}
                />
              ))}
            </ScrollView>
          </View>
        </SectionCard>

        <View className="mt-6 rounded-[28px] bg-emerald-600 p-6 shadow-lg">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-emerald-100">Thu nhập ròng</Text>
              <Text className="mt-2 text-3xl font-bold tracking-tight text-white">{formatCurrency(data?.summary.net ?? 0)}</Text>
              <Text className="mt-1 text-sm leading-6 text-emerald-50">{periodLabel} • {walletLabel} • Tỷ lệ tiết kiệm {(data?.kpis?.savingsRate ?? 0).toFixed(0)}%</Text>
            </View>
            <View className="rounded-full bg-white/15 p-3">
              <ChartPie size={20} color="#ffffff" />
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2 border-t border-emerald-500/50 pt-4">
            <View className="rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-xs font-medium text-white">Chi định kỳ: {formatCompactCurrency(recurringSpend)}</Text>
            </View>
            <View className="rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-xs font-medium text-white">Chi TB/ngày: {formatCompactCurrency(data?.kpis?.dailyAverageExpense ?? 0)}</Text>
            </View>
            <View className="rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-xs font-medium text-white">{data?.kpis?.transactionCount ?? 0} giao dịch</Text>
            </View>
          </View>
        </View>

        <View className="mt-6 gap-3">
          {metricCards.map((item) => (
            <MetricCard
              key={item.label}
              title={item.label}
              value={item.value}
              icon={item.icon}
              details={item.details}
              open={openMetricInfo === item.label}
              onToggle={() => setOpenMetricInfo((current) => current === item.label ? null : item.label)}
            />
          ))}
        </View>

        <View className="mt-8">
          <SectionCard
            title="AI Financial Insight"
            subtitle={`${periodLabel} • ${walletLabel}`}
            rightSlot={
              <View className="rounded-full bg-slate-900 px-3 py-1.5">
                <View className="flex-row items-center gap-1.5">
                  <BrainCircuit size={12} color="#ffffff" />
                  <Text className="text-[11px] font-semibold text-white">{isAiFetching ? 'Đang phân tích' : shouldUseAiInsight ? 'Gemini Live' : 'Live Insight'}</Text>
                </View>
              </View>
            }
            className="mb-0"
          >
            <View className="gap-3">
              <View className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                <Text className="text-sm font-semibold text-slate-900">
                  {(data?.insights?.severity ?? 'neutral') === 'warning' ? '⚠️' : (data?.insights?.severity ?? 'neutral') === 'good' ? '✅' : '📊'} {aiHeadline}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">
                  {isAiFetching ? 'Gemini đang đọc dữ liệu thực tế để sinh insight cá nhân hóa...' : aiMessage}
                </Text>
              </View>

              <View className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
                <Text className="text-sm font-semibold text-slate-900">💡 {aiRecommendation}</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-white px-3 py-1.5">
                    <Text className="text-xs text-slate-700">Danh mục rủi ro: {data?.insights?.riskiestCategory ?? topCategory?.name ?? 'Chưa xác định'}</Text>
                  </View>
                  <View className="rounded-full bg-white px-3 py-1.5">
                    <Text className="text-xs text-slate-700">Chi định kỳ: {formatCompactCurrency(recurringSpend)}</Text>
                  </View>
                  <View className="rounded-full bg-white px-3 py-1.5">
                    <Text className="text-xs text-slate-700">Giao dịch kỳ này: {data?.kpis?.transactionCount ?? 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          </SectionCard>
        </View>

        <View className="mt-8">
          <SectionCard title="So sánh Thu / Chi" subtitle={periodLabel} className="mb-0">
            {trend.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu so sánh"
                description="Biểu đồ thu và chi sẽ xuất hiện tại đây khi analytics service trả dữ liệu."
              />
            ) : (
              <View className="gap-3">
                <View className="h-44 flex-row items-end gap-2">
                  {trend.map((item) => (
                    <View key={item.label} className="flex-1 items-center">
                      <View className="h-36 w-full flex-row items-end justify-center gap-1 rounded-[18px] bg-slate-50 px-2 pb-2">
                        <View
                          className="w-3 rounded-t-full bg-emerald-500"
                          style={{ height: `${Math.max((item.income / topMax) * 100, 8)}%` }}
                        />
                        <View
                          className="w-3 rounded-t-full bg-rose-500"
                          style={{ height: `${Math.max((item.expense / topMax) * 100, 8)}%` }}
                        />
                      </View>
                      <Text className="mt-2 text-xs text-slate-500">{item.label}</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full bg-emerald-500" />
                    <Text className="text-xs text-slate-500">Thu</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full bg-rose-500" />
                    <Text className="text-xs text-slate-500">Chi</Text>
                  </View>
                </View>
              </View>
            )}
          </SectionCard>
        </View>

        <View className="mt-8">
          <SectionCard title="Danh mục chi tiêu" subtitle={topCategory ? `Nhóm cao nhất: ${topCategory.name}` : 'Chưa có dữ liệu'} className="mb-0">
            {breakdown.length === 0 ? (
              <EmptyState title="Chưa có danh mục chi tiêu" description="Breakdown theo danh mục sẽ hiển thị tại đây." />
            ) : (
              <View className="gap-3">
                {breakdown.map((item) => {
                  const ratio = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                  return (
                    <View key={item.categoryId}>
                      <View className="mb-1 flex-row items-center justify-between">
                        <Text className="text-sm font-medium text-slate-800">{item.name}</Text>
                        <Text className="text-sm text-slate-500">{formatCurrency(item.value)}</Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <View className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(ratio, 6)}%` }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
        </View>

        <View className="mt-8">
          <SectionCard title="Theo dõi ngân sách" subtitle="Các nhóm gần chạm ngưỡng sẽ được làm nổi bật rõ ràng." className="mb-0">
            {budgets.length === 0 ? (
              <EmptyState title="Chưa có cảnh báo ngân sách" description="Ngưỡng cảnh báo sẽ hiện tại đây khi API cung cấp dữ liệu." />
            ) : (
              <View className="gap-3">
                {budgets.map((item) => {
                  const isWarning = item.percent >= 90;
                  return (
                    <View key={item.category} className="rounded-[20px] bg-slate-50 p-3.5">
                      <View className="mb-2 flex-row items-center justify-between">
                        <View>
                          <Text className="font-medium text-slate-800">{item.category}</Text>
                          <Text className="mt-0.5 text-xs text-slate-500">Đã chi {formatCompactCurrency(item.spent)} trên hạn mức {formatCompactCurrency(item.limit)}</Text>
                        </View>
                        <Text className={`text-sm font-semibold ${isWarning ? 'text-rose-600' : 'text-emerald-700'}`}>{item.percent}%</Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <View
                          className={`h-2 rounded-full ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(Math.max(item.percent, 8), 100)}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
        </View>

        <View className="mt-8">
          <SectionCard title="Top giao dịch" subtitle="Các giao dịch lớn nhất giúp nhìn rõ điểm rơi dòng tiền trong kỳ." className="mb-0">
            {topTransactions.length === 0 ? (
              <EmptyState title="Chưa có giao dịch nổi bật" description="Top giao dịch sẽ xuất hiện tại đây khi analytics backend trả dữ liệu." />
            ) : (
              <View className="gap-3">
                {topTransactions.map((item) => (
                  <View key={`${item.id}-${item.date}`} className="rounded-[20px] bg-slate-50 px-4 py-3.5">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-800">{item.merchant}</Text>
                        <Text className="mt-1 text-xs leading-5 text-slate-500">{item.category} • {item.date}{item.source ? ` • ${item.source}` : ''}</Text>
                      </View>
                      <Text className={`text-sm font-bold ${item.transactionType === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {item.transactionType === 'INCOME' ? '+' : '-'}{formatCompactCurrency(Math.abs(item.amount))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </View>

        <View className="mt-8">
          <SectionCard
            title="Chi tiêu định kỳ"
            subtitle="Tổng các khoản cố định đang hoạt động được lấy từ recurring rules thực tế."
            rightSlot={
              <View className="rounded-[18px] bg-rose-50 px-3 py-2">
                <Text className="text-[11px] font-medium text-rose-500">Tổng cố định / kỳ</Text>
                <Text className="mt-1 text-sm font-bold text-rose-600">{formatCompactCurrency(recurringSpend)}</Text>
              </View>
            }
            className="mb-0"
          >
            {subscriptions.length === 0 ? (
              <EmptyState title="Chưa có khoản định kỳ" description="Khi recurring rules có dữ liệu, danh sách khoản cố định sẽ hiển thị tại đây." />
            ) : (
              <View className="gap-3">
                {subscriptions.map((item) => (
                  <View key={item.id} className="rounded-[20px] bg-slate-50 px-4 py-3.5">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-800">{item.name}</Text>
                        <Text className="mt-1 text-xs leading-5 text-slate-500">{item.date} • {item.frequency === 'MONTHLY' ? 'Hàng tháng' : 'Hàng tuần'}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-bold text-slate-900">{formatCompactCurrency(item.amount)}</Text>
                        <Text className={`mt-1 text-[11px] font-medium ${item.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                <View className="rounded-[20px] border border-emerald-100 bg-emerald-50/80 px-4 py-3.5">
                  <View className="flex-row items-center gap-2">
                    <Sparkles size={16} color="#059669" />
                    <Text className="text-sm font-semibold text-emerald-900">Gợi ý tối ưu</Text>
                  </View>
                  <Text className="mt-2 text-sm leading-6 text-emerald-800">
                    Ưu tiên rà soát các khoản định kỳ ít sử dụng hoặc trùng vai trò để cải thiện nhanh tỷ lệ tiết kiệm hàng tháng.
                  </Text>
                </View>
              </View>
            )}
          </SectionCard>
        </View>
      </ScrollView>
    </View>
  );
}
