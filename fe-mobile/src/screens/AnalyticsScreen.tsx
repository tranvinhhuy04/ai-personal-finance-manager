import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight, ChartPie, Sparkles, TrendingUp } from 'lucide-react-native';

import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SkeletonLoading } from '../components/SkeletonLoading';
import { useCashflow } from '../hooks/useCashflow';
import { useWallets } from '../hooks/useWallets';
import type { TimeRange } from '../types/finance';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';

const RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
];

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
    <Pressable onPress={onPress} className={`rounded-full px-4 py-2 ${selected ? 'bg-emerald-600' : 'bg-slate-100'}`}>
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ title, value, tone }: { title: string; value: string; tone: 'emerald' | 'rose' }) {
  const bgClass = tone === 'emerald' ? 'bg-emerald-50' : 'bg-rose-50';
  const textClass = tone === 'emerald' ? 'text-emerald-700' : 'text-rose-600';

  return (
    <View className={`w-[48%] rounded-2xl p-4 ${bgClass}`}>
      <Text className="text-sm font-medium text-slate-500">{title}</Text>
      <Text className={`mt-2 text-xl font-bold ${textClass}`}>{value}</Text>
    </View>
  );
}

export function AnalyticsScreen() {
  const [range, setRange] = useState<TimeRange>('month');
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(undefined);
  const { rawWallets } = useWallets();
  const { data, isLoading, isRefreshing, isDemoMode, errorMessage, refetch } = useCashflow(range, selectedWalletId);

  const trend = data?.comparison ?? [];
  const breakdown = data?.breakdown ?? [];
  const budgets = data?.budgetProgress ?? [];
  const topMax = Math.max(...trend.flatMap((item) => [item.income, item.expense]), 1);
  const totalExpense = data?.summary.totalExpense ?? 0;
  const topCategory = breakdown[0];

  const walletOptions = useMemo(
    () => [{ id: 'all', name: 'Tất cả ví' }, ...rawWallets.map((wallet) => ({ id: wallet.id, name: wallet.walletName }))],
    [rawWallets]
  );

  if (isLoading && !data) {
    return <SkeletonLoading />;
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Biểu đồ và phân tích chi tiêu theo ngôn ngữ thiết kế đồng bộ với web."
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} />}
      >
        {isDemoMode ? (
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-sm font-medium text-amber-800">Analytics đang dùng dữ liệu demo để bạn xem giao diện đầy đủ.</Text>
            {errorMessage ? <Text className="mt-1 text-xs text-amber-700">{errorMessage}</Text> : null}
          </View>
        ) : null}

        <SectionCard title="Bộ lọc phân tích" subtitle="Chọn khoảng thời gian và ví để xem báo cáo chính xác." className="mb-0">
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              {RANGES.map((item) => (
                <FilterChip key={item.key} label={item.label} selected={range === item.key} onPress={() => setRange(item.key)} />
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2">
              {walletOptions.slice(0, 5).map((wallet) => (
                <FilterChip
                  key={wallet.id}
                  label={wallet.name}
                  selected={(selectedWalletId ?? 'all') === wallet.id}
                  onPress={() => setSelectedWalletId(wallet.id === 'all' ? undefined : wallet.id)}
                />
              ))}
            </View>
          </View>
        </SectionCard>

        <View className="mt-6 rounded-[24px] bg-emerald-600 p-6 shadow-lg">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-emerald-100">Dòng tiền ròng</Text>
              <Text className="mt-2 text-3xl font-bold tracking-tight text-white">{formatCurrency(data?.summary.net ?? 0)}</Text>
              <Text className="mt-1 text-sm text-emerald-50">{data?.period?.label ?? 'Kỳ hiện tại'} • Tỷ lệ tiết kiệm {(data?.kpis?.savingsRate ?? 0).toFixed(0)}%</Text>
            </View>
            <View className="rounded-full bg-white/15 p-3">
              <ChartPie size={20} color="#ffffff" />
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row justify-between">
          <MetricCard title="Thu nhập" value={formatCompactCurrency(data?.summary.totalIncome ?? 0)} tone="emerald" />
          <MetricCard title="Chi tiêu" value={formatCompactCurrency(data?.summary.totalExpense ?? 0)} tone="rose" />
        </View>

        <View className="mt-8">
          <SectionCard title="So sánh Thu / Chi" subtitle={data?.period?.label ?? 'Cập nhật theo backend'} className="mb-0">
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
          <SectionCard title="Cảnh báo ngân sách" subtitle="Các nhóm gần chạm ngưỡng sẽ được làm nổi bật rõ ràng." className="mb-0">
            {budgets.length === 0 ? (
              <EmptyState title="Chưa có cảnh báo ngân sách" description="Ngưỡng cảnh báo sẽ hiện tại đây khi API cung cấp dữ liệu." />
            ) : (
              <View className="gap-3">
                {budgets.map((item) => {
                  const isWarning = item.percent >= 90;
                  return (
                    <View key={item.category} className="rounded-[18px] bg-slate-50 p-3">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="font-medium text-slate-800">{item.category}</Text>
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
          <SectionCard title="AI insight" subtitle="Rút gọn từ logic và bố cục Analytics Web." className="mb-0">
            <View className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <Sparkles size={18} color="#059669" />
                <Text className="font-semibold text-emerald-900">{data?.insights?.headline ?? 'Hệ thống đang phân tích chi tiêu của bạn.'}</Text>
              </View>
              <Text className="text-sm leading-6 text-emerald-800">
                {data?.insights?.message ?? 'Chi tiêu của bạn đang nằm trong vùng an toàn, nhưng nhóm mua sắm cần được theo dõi thêm.'}
              </Text>
              <Text className="mt-3 text-sm font-medium text-slate-800">
                Gợi ý: {data?.insights?.recommendation ?? 'Duy trì ngân sách tuần và ưu tiên quỹ dự phòng.'}
              </Text>
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </View>
  );
}
