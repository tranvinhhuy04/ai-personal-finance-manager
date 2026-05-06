import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { CreditCard, Lock, Plus, ShieldCheck, Sparkles, Wallet2 } from 'lucide-react-native';

import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SkeletonLoading } from '../components/SkeletonLoading';
import { WalletCard } from '../components/WalletCard';
import { useWallets, toWalletCardItem } from '../hooks/useWallets';
import type { WalletType } from '../types/finance';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';

const WALLET_TYPES: WalletType[] = ['CARD', 'MOMO', 'ZALOPAY', 'CASH'];

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

export function MyWalletsScreen() {
  const {
    wallets,
    rawWallets,
    summary,
    filter,
    setFilter,
    isLoading,
    isRefreshing,
    isDemoMode,
    errorMessage,
    refetch,
    createWallet,
    isCreating,
    toggleWalletStatus,
    isTogglingStatus,
  } = useWallets();

  const [walletName, setWalletName] = useState('');
  const [balance, setBalance] = useState('0');
  const [walletType, setWalletType] = useState<WalletType>('CARD');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      setFeedback('Vui lòng nhập tên ví trước khi tạo.');
      return;
    }

    try {
      await createWallet({
        walletName: walletName.trim(),
        walletType,
        balance: Number(balance || 0),
      });

      setWalletName('');
      setBalance('0');
      setWalletType('CARD');
      setFeedback('Đã tạo ví mới thành công.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Không thể tạo ví mới.');
    }
  };

  if (isLoading && rawWallets.length === 0) {
    return <SkeletonLoading />;
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        eyebrow="Wallet Center"
        title="Ví của tôi"
        subtitle="Quản lý số dư, trạng thái và thêm ví nhanh ngay trên mobile."
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} />}
      >
        {isDemoMode ? (
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-sm font-medium text-amber-800">Đang hiển thị dữ liệu demo vì backend hoặc token chưa sẵn sàng.</Text>
            {errorMessage ? <Text className="mt-1 text-xs text-amber-700">{errorMessage}</Text> : null}
          </View>
        ) : null}

        <View className="rounded-[24px] bg-slate-900 p-6 shadow-lg">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-slate-300">Tổng số dư trong ví</Text>
              <Text className="mt-2 text-3xl font-bold tracking-tight text-white">{formatCurrency(summary.totalBalance)}</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-300">
                {summary.totalCount} ví • {summary.activeCount} ví hoạt động • {summary.inactiveCount} ví tạm khóa
              </Text>
            </View>
            <View className="rounded-full bg-white/10 p-3">
              <Wallet2 size={20} color="#ffffff" />
            </View>
          </View>

          <View className="mt-4 border-t border-slate-700 pt-4 flex-row justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wider text-slate-400">Số lượng ví</Text>
              <Text className="mt-1 text-base font-semibold text-white">{summary.totalCount}</Text>
            </View>
            <View>
              <Text className="text-xs uppercase tracking-wider text-slate-400">Số dư gọn</Text>
              <Text className="mt-1 text-base font-semibold text-emerald-300">{formatCompactCurrency(summary.totalBalance)}</Text>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row justify-between">
          <View className="w-[48%] rounded-2xl bg-white p-4 shadow-sm">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <CreditCard size={18} color="#059669" />
            </View>
            <Text className="mt-4 text-sm text-slate-500">Ví đang hoạt động</Text>
            <Text className="mt-1 text-2xl font-bold text-slate-900">{summary.activeCount}</Text>
          </View>

          <View className="w-[48%] rounded-2xl bg-white p-4 shadow-sm">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <Wallet2 size={18} color="#059669" />
            </View>
            <Text className="mt-4 text-sm text-slate-500">Số dư tổng</Text>
            <Text className="mt-1 text-xl font-bold text-emerald-700">{formatCompactCurrency(summary.totalBalance)}</Text>
          </View>
        </View>

        <View className="mt-8">
          <SectionCard title="Bộ lọc nhanh" subtitle="Chạm để chuyển giữa các trạng thái ví." className="mb-0">
            <View className="flex-row flex-wrap gap-2">
              <FilterChip label="Tất cả" selected={filter === 'all'} onPress={() => setFilter('all')} />
              <FilterChip label="Hoạt động" selected={filter === 'active'} onPress={() => setFilter('active')} />
              <FilterChip label="Tạm khóa" selected={filter === 'locked'} onPress={() => setFilter('locked')} />
            </View>
          </SectionCard>
        </View>

        <View className="mt-8">
          <SectionCard title="Thêm ví nhanh" subtitle="Form mobile tối ưu với input lớn, rõ và dễ thao tác." className="mb-0">
            <View className="gap-3">
              <View>
                <Text className="mb-1 text-sm font-medium text-slate-600">Tên ví</Text>
                <TextInput
                  value={walletName}
                  onChangeText={setWalletName}
                  placeholder="Ví dụ: Ví lương, Ví ăn uống"
                  className="min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />
              </View>

              <View>
                <Text className="mb-1 text-sm font-medium text-slate-600">Số dư ban đầu</Text>
                <TextInput
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="numeric"
                  placeholder="0"
                  className="min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-slate-600">Loại ví</Text>
                <View className="flex-row flex-wrap gap-2">
                  {WALLET_TYPES.map((type) => (
                    <FilterChip
                      key={type}
                      label={type}
                      selected={walletType === type}
                      onPress={() => setWalletType(type)}
                    />
                  ))}
                </View>
              </View>

              {feedback ? <Text className="text-sm text-slate-500">{feedback}</Text> : null}

              <PrimaryButton
                label="Tạo ví mới"
                icon={<Plus size={16} color="#ffffff" />}
                loading={isCreating}
                onPress={() => void handleCreateWallet()}
              />
            </View>
          </SectionCard>
        </View>

        <View className="mt-8">
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-800">Danh sách ví</Text>
              <Text className="mt-1 text-sm text-slate-500">Đang hiển thị {wallets.length} ví theo bộ lọc hiện tại.</Text>
            </View>
            <View className="rounded-full bg-emerald-50 px-3 py-1">
              <Text className="text-xs font-semibold text-emerald-700">{wallets.length} ví</Text>
            </View>
          </View>

          <View className="rounded-[24px] bg-white p-4 shadow-sm">
            {wallets.length === 0 ? (
              <EmptyState
                title="Chưa có ví nào"
                description="Tạo ví đầu tiên để bắt đầu theo dõi tài chính cá nhân trên mobile."
              />
            ) : (
              wallets.map((wallet) => {
                const isActive = wallet.status === 1;

                return (
                  <View key={wallet.id}>
                    <WalletCard wallet={toWalletCardItem(wallet)} />

                    <View className="mb-4 mt-[-6px] flex-row gap-2 px-1">
                      <View className="flex-1">
                        <PrimaryButton
                          label={isActive ? 'Tạm khóa ví' : 'Mở lại ví'}
                          variant="secondary"
                          loading={isTogglingStatus}
                          icon={isActive ? <Lock size={16} color="#0f172a" /> : <ShieldCheck size={16} color="#0f172a" />}
                          onPress={() => void toggleWalletStatus({ walletId: wallet.id, nextStatus: isActive ? 2 : 1 })}
                        />
                      </View>
                      <View className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
                        <Text className="text-xs text-slate-500">Số dư hiện tại</Text>
                        <Text className="mt-1 text-sm font-semibold text-slate-800">{formatCurrency(wallet.balance)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View className="mt-8 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Sparkles size={16} color="#059669" />
            <Text className="font-semibold text-emerald-900">Mẹo quản lý ví</Text>
          </View>
          <Text className="text-sm leading-6 text-emerald-800">
            Ưu tiên giữ ví ngân hàng cho quỹ an toàn, dùng ví điện tử cho chi tiêu hằng ngày và theo dõi hạn mức mỗi tuần để tránh vượt ngân sách.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
