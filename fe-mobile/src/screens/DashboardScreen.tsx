import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDownRight, ArrowUpRight, PiggyBank, TrendingUp, Wallet2 } from 'lucide-react-native';

import { EmptyState } from '../components/EmptyState';
import { SkeletonLoading } from '../components/SkeletonLoading';
import { WalletCard } from '../components/WalletCard';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { toWalletCardItem, useWallets } from '../hooks/useWallets';
import type { TimeRange } from '../types/finance';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';

const RANGE_OPTIONS: Array<{ key: TimeRange; label: string }> = [
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
];

function FilterPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${selected ? 'bg-emerald-600' : 'bg-slate-100'}`}
    >
      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-slate-600'}`}>{label}</Text>
    </Pressable>
  );
}

function QuickStatCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <View className="w-[48%] rounded-2xl bg-white p-4 shadow-sm">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">{icon}</View>
      <Text className="mt-4 text-sm font-medium text-slate-500">{title}</Text>
      <Text className="mt-1 text-xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-1 text-xs text-slate-400">{hint}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const [range, setRange] = useState<TimeRange>('month');
  const overview = useDashboardOverview(range);
  const wallets = useWallets();

  const featuredWallets = useMemo(() => wallets.rawWallets.slice(0, 6), [wallets.rawWallets]);
  const bars = overview.data.cashflowBars;
  const maxBarValue = Math.max(...bars.flatMap((item) => [item.income, item.expense]), 1);

  if (overview.isLoading && wallets.isLoading) {
    return <SkeletonLoading />;
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-slate-50"
        refreshControl={
          <RefreshControl
            refreshing={overview.isRefreshing || wallets.isRefreshing}
            onRefresh={() => {
              void overview.refetch();
              void wallets.refetch();
            }}
          />
        }
      >
        <View className="px-5 pt-4 pb-10">
          <View className="mb-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Fintech Mobile</Text>
            <Text className="mt-2 text-[28px] font-bold text-slate-900">Dashboard</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Tổng quan ví, dòng tiền và insight tài chính theo phong cách từ bản web.
            </Text>
          </View>

          {overview.errorMessage || wallets.errorMessage ? (
            <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Text className="text-sm font-medium text-amber-800">Chưa tải được đầy đủ dữ liệu từ backend.</Text>
              <Text className="mt-1 text-xs text-amber-700">{overview.errorMessage ?? wallets.errorMessage}</Text>
            </View>
          ) : null}

          <View className="rounded-[24px] bg-emerald-600 p-6 shadow-lg">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-emerald-100">Tổng số dư của tôi</Text>
                <Text className="text-4xl font-bold tracking-tight text-white">{formatCurrency(overview.data.totalBalance)}</Text>
              </View>
              <View className="rounded-full bg-white/15 p-3">
                <Wallet2 size={22} color="#ffffff" />
              </View>
            </View>

            <View className="mt-4 border-t border-emerald-500/50 pt-4">
              <Text className="text-xs text-emerald-50">
                {overview.data.totalWallets} ví • {overview.data.activeWallets} ví đang hoạt động
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row justify-between">
            <QuickStatCard
              icon={<PiggyBank size={18} color="#059669" />}
              title="Tiết kiệm"
              value={formatCompactCurrency(overview.data.totalSavings)}
              hint="Quỹ dự phòng"
            />
            <QuickStatCard
              icon={<TrendingUp size={18} color="#059669" />}
              title="Đầu tư"
              value={formatCompactCurrency(overview.data.totalInvestments)}
              hint="Tăng trưởng"
            />
          </View>

          <View className="mt-8">
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-800">Ví nổi bật</Text>
                <Text className="mt-1 text-sm text-slate-500">Các ví được đồng bộ từ backend và hiển thị theo dạng card.</Text>
              </View>
              <View className="flex-row gap-2">
                {RANGE_OPTIONS.map((item) => (
                  <FilterPill
                    key={item.key}
                    label={item.label}
                    selected={range === item.key}
                    onPress={() => setRange(item.key)}
                  />
                ))}
              </View>
            </View>

            <View className="rounded-[24px] bg-white py-4 shadow-sm">
              {featuredWallets.length === 0 ? (
                <View className="px-4">
                  <EmptyState
                    title="Chưa có ví nào"
                    description="Khi API ví sẵn sàng, danh sách ví nổi bật sẽ xuất hiện tại đây."
                  />
                </View>
              ) : (
                <FlatList
                  data={featuredWallets}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingRight: 28 }}
                  renderItem={({ item }) => <WalletCard wallet={toWalletCardItem(item)} variant="compact" />}
                />
              )}
            </View>
          </View>

          <View className="mt-8">
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-800">Dòng tiền</Text>
                <Text className="mt-1 text-sm text-slate-500">{overview.data.periodLabel}</Text>
              </View>
              <View className="flex-row gap-2">
                {RANGE_OPTIONS.map((item) => (
                  <FilterPill
                    key={`cashflow-${item.key}`}
                    label={item.label}
                    selected={range === item.key}
                    onPress={() => setRange(item.key)}
                  />
                ))}
              </View>
            </View>

            <View className="rounded-[24px] bg-white p-4 shadow-sm">
              {bars.length === 0 ? (
                <EmptyState
                  title="Chưa có dữ liệu dòng tiền"
                  description="Biểu đồ thu và chi sẽ hiển thị tại đây ngay khi analytics service trả dữ liệu."
                />
              ) : (
                <>
                  <View className="h-44 flex-row items-end justify-between gap-2">
                    {bars.map((item) => (
                      <View key={item.monthKey || item.month} className="flex-1 items-center">
                        <View className="h-32 w-full flex-row items-end justify-center gap-1 rounded-2xl bg-slate-50 px-2 pb-2">
                          <View
                            className="w-3 rounded-t-full bg-emerald-500"
                            style={{ height: `${Math.max((item.income / maxBarValue) * 100, 10)}%` }}
                          />
                          <View
                            className="w-3 rounded-t-full bg-rose-500"
                            style={{ height: `${Math.max((item.expense / maxBarValue) * 100, 10)}%` }}
                          />
                        </View>
                        <Text className="mt-2 text-xs text-slate-500">{item.month}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="mt-4 flex-row justify-between">
                    <View className="w-[48%] rounded-2xl bg-emerald-50 p-4">
                      <View className="flex-row items-center gap-2">
                        <ArrowUpRight size={16} color="#059669" />
                        <Text className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Thu nhập</Text>
                      </View>
                      <Text className="mt-2 text-lg font-bold text-emerald-800">{formatCurrency(overview.data.totalIncome)}</Text>
                    </View>

                    <View className="w-[48%] rounded-2xl bg-rose-50 p-4">
                      <View className="flex-row items-center gap-2">
                        <ArrowDownRight size={16} color="#e11d48" />
                        <Text className="text-xs font-semibold uppercase tracking-wider text-rose-700">Chi tiêu</Text>
                      </View>
                      <Text className="mt-2 text-lg font-bold text-rose-700">{formatCurrency(overview.data.totalExpense)}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          <View className="mt-8">
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-800">Insight nhanh</Text>
                <Text className="mt-1 text-sm text-slate-500">Những điểm nổi bật được chuẩn bị sẵn để gắn AI/backend.</Text>
              </View>
            </View>

            <View className="rounded-[24px] bg-white p-4 shadow-sm">
              <View className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
                <Text className="text-sm font-semibold text-emerald-900">
                  {overview.data.insights?.headline ?? 'Bạn đang kiểm soát dòng tiền khá tốt.'}
                </Text>
                <Text className="mt-1 text-sm leading-6 text-emerald-800">
                  {overview.data.insights?.message ?? 'Hãy tiếp tục duy trì tỷ lệ tiết kiệm ổn định và theo dõi danh mục chi lớn nhất.'}
                </Text>
                {overview.data.topCategory ? (
                  <Text className="mt-3 text-sm font-medium text-slate-800">
                    Danh mục đáng chú ý: {overview.data.topCategory.name} • {formatCurrency(overview.data.topCategory.value)}
                  </Text>
                ) : null}
              </View>

              <View className="mt-4 gap-3">
                {overview.data.latestTransactions.length === 0 ? (
                  <EmptyState
                    title="Chưa có giao dịch nổi bật"
                    description="Danh sách giao dịch gần nhất sẽ hiển thị tại đây khi analytics backend trả dữ liệu."
                  />
                ) : (
                  overview.data.latestTransactions.map((item) => (
                    <View key={item.id} className="rounded-[18px] bg-slate-50 p-3">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-slate-800">{item.merchant}</Text>
                          <Text className="mt-1 text-xs text-slate-500">{item.category} • {item.date}</Text>
                        </View>
                        <Text className={`text-sm font-semibold ${item.transactionType === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {item.transactionType === 'INCOME' ? '+' : '-'}{formatCompactCurrency(item.amount)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
