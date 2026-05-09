import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Banknote,
  Landmark,
  Lock,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet2,
} from 'lucide-react-native';

import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { SkeletonLoading } from '../components/SkeletonLoading';
import { useWallets } from '../hooks/useWallets';
import { useAppPreferences } from '../hooks/useAppPreferences';
import type { Wallet, WalletType } from '../types/finance';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';

const WALLET_TYPES: WalletType[] = ['CARD', 'MOMO', 'ZALOPAY', 'CASH'];
const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  CARD: 'Ngân hàng',
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
  CASH: 'Tiền mặt',
};

type WalletIconConfig = {
  icon: React.ComponentType<{ size: number; color: string }>;
  bg: string;
  iconColor: string;
  accent: string;
};

function resolveWalletIcon(type: WalletType, name: string): WalletIconConfig {
  const n = name.toLowerCase();
  if (type === 'MOMO' || n.includes('momo')) {
    return { icon: Smartphone, bg: '#fce7f3', iconColor: '#ec4899', accent: '#be185d' };
  }
  if (type === 'ZALOPAY' || n.includes('zalo')) {
    return { icon: Wallet2, bg: '#e0f2fe', iconColor: '#0891b2', accent: '#0e7490' };
  }
  if (type === 'CASH' || n.includes('tiền mặt') || n.includes('cash')) {
    return { icon: Banknote, bg: '#d1fae5', iconColor: '#059669', accent: '#047857' };
  }
  return { icon: Landmark, bg: '#f1f5f9', iconColor: '#475569', accent: '#334155' };
}

function WalletListItem({
  wallet,
  isToggling,
  onToggle,
}: {
  wallet: Wallet;
  isToggling: boolean;
  onToggle: () => void;
}) {
  const isActive = wallet.status === 1;
  const cfg = resolveWalletIcon(wallet.walletType, wallet.walletName);
  const Icon = cfg.icon;

  return (
    <View className="rounded-[20px] bg-white overflow-hidden" style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 }}>
      {/* Top strip accent */}
      <View style={{ height: 3, backgroundColor: cfg.accent }} />

      <View className="p-4">
        <View className="flex-row items-center gap-3">
          {/* Icon */}
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: cfg.bg }}>
            <Icon size={20} color={cfg.iconColor} />
          </View>

          {/* Name + type */}
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>{wallet.walletName}</Text>
            <Text className="text-xs text-slate-400">{WALLET_TYPE_LABELS[wallet.walletType]}</Text>
          </View>

          {/* Status badge */}
          <View className={`rounded-full px-2.5 py-1 ${isActive ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            <Text className={`text-[10px] font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isActive ? '● Hoạt động' : '○ Tạm khóa'}
            </Text>
          </View>
        </View>

        {/* Balance */}
        <View className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
          <Text className="text-[10px] uppercase tracking-wider text-slate-400">Số dư khả dụng</Text>
          <Text className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">{formatCurrency(wallet.balance)}</Text>
        </View>

        {/* Action */}
        <Pressable
          onPress={onToggle}
          disabled={isToggling}
          className={`min-h-[44px] mt-3 flex-row items-center justify-center gap-2 rounded-2xl py-3 ${isActive ? 'bg-slate-100' : 'bg-emerald-50'}`}
        >
          {isActive
            ? <Lock size={14} color="#64748b" />
            : <ShieldCheck size={14} color="#059669" />}
          <Text className={`text-sm font-semibold ${isActive ? 'text-slate-600' : 'text-emerald-700'}`}>
            {isToggling ? 'Đang xử lý...' : isActive ? 'Tạm khóa ví' : 'Mở lại ví'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function TypeButton({
  type,
  selected,
  onPress,
}: {
  type: WalletType;
  selected: boolean;
  onPress: () => void;
}) {
  const cfg = resolveWalletIcon(type, '');
  const Icon = cfg.icon;

  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 ${selected ? 'bg-slate-800' : 'bg-slate-100'}`}
    >
      <Icon size={18} color={selected ? '#ffffff' : cfg.iconColor} />
      <Text className={`text-[11px] font-semibold ${selected ? 'text-white' : 'text-slate-600'}`}>
        {WALLET_TYPE_LABELS[type]}
      </Text>
    </Pressable>
  );
}

export function MyWalletsScreen() {
  const { preferences } = useAppPreferences();
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
  const [balance, setBalance] = useState('');
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
      setBalance('');
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
    <SafeAreaView edges={['top', 'left', 'right']} className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <ScreenHeader
        eyebrow="Wallet Center"
        title="Ví của tôi"
        subtitle="Theo dõi số dư, trạng thái vận hành và cập nhật cấu trúc ví trực tiếp trên mobile."
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} />}
      >
        {isDemoMode ? (
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-sm font-medium text-amber-800">Đang hiển thị dữ liệu mô phỏng.</Text>
            {errorMessage ? <Text className="mt-1 text-xs text-amber-700">{errorMessage}</Text> : null}
          </View>
        ) : null}

        {/* Hero balance card */}
        <LinearGradient
          colors={['#0f172a', '#1e3a5f', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[24px] p-6"
          style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }}
        >
          <View className="mb-5 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Wallet2 size={20} color="#ffffff" />
            </View>
            <View>
              <Text className="text-xs uppercase tracking-widest text-slate-400">Tổng tài sản</Text>
              <Text className="text-[11px] text-slate-500">{summary.totalCount} ví được ghi nhận</Text>
            </View>
          </View>

          <Text className="text-4xl font-extrabold tracking-tight text-white">{formatCurrency(summary.totalBalance)}</Text>
          <Text className="mt-1 text-sm text-slate-400">{formatCompactCurrency(summary.totalBalance)}</Text>

          <View className="mt-5 flex-row gap-3 border-t border-white/10 pt-4">
            <View className="flex-1 rounded-xl bg-white/10 px-3 py-2">
              <Text className="text-[10px] uppercase tracking-wider text-slate-500">Hoạt động</Text>
              <Text className="mt-1 text-lg font-bold text-emerald-400">{summary.activeCount}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-white/10 px-3 py-2">
              <Text className="text-[10px] uppercase tracking-wider text-slate-500">Tạm khóa</Text>
              <Text className="mt-1 text-lg font-bold text-slate-400">{summary.inactiveCount}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-white/10 px-3 py-2">
              <Text className="text-[10px] uppercase tracking-wider text-slate-500">Tổng ví</Text>
              <Text className="mt-1 text-lg font-bold text-white">{summary.totalCount}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Filter row */}
        <View className="mt-5 flex-row gap-2">
          <Chip label="Tất cả" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Hoạt động" selected={filter === 'active'} onPress={() => setFilter('active')} />
          <Chip label="Tạm khóa" selected={filter === 'locked'} onPress={() => setFilter('locked')} />
        </View>

        {/* Create wallet form */}
        <SectionCard title="Tạo ví mới" subtitle="Điền tên, số dư ban đầu và loại ví." className="mt-6">
          <View className="gap-4">
            {/* Wallet type selector */}
            <View className="flex-row gap-2">
              {WALLET_TYPES.map((type) => (
                <TypeButton
                  key={type}
                  type={type}
                  selected={walletType === type}
                  onPress={() => setWalletType(type)}
                />
              ))}
            </View>

            {/* Name input */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Tên ví</Text>
              <TextInput
                value={walletName}
                onChangeText={setWalletName}
                placeholder="VD: Ví lương, Ví ăn uống, Ví đầu tư..."
                placeholderTextColor="#94a3b8"
                className="min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
              />
            </View>

            {/* Balance input */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-600">Số dư ban đầu (VND)</Text>
              <TextInput
                value={balance}
                onChangeText={setBalance}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                className="min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900"
              />
            </View>

            {feedback ? (
              <Text className={`text-sm font-medium ${feedback.startsWith('Đã tạo') ? 'text-emerald-700' : 'text-rose-600'}`}>
                {feedback}
              </Text>
            ) : null}

            {/* Create button - full width gradient */}
            <Pressable
              onPress={() => void handleCreateWallet()}
              disabled={isCreating}
              className={`overflow-hidden rounded-2xl ${isCreating ? 'opacity-60' : ''}`}
            >
              <LinearGradient
                colors={['#059669', '#047857', '#065f46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-row items-center justify-center gap-2 py-4"
              >
                <Plus size={18} color="#ffffff" />
                <Text className="text-base font-bold text-white">
                  {isCreating ? 'Đang tạo ví...' : 'Tạo ví ngay'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SectionCard>

        {/* Wallet list */}
        <View className="mt-2">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Danh sách ví</Text>
            <View className="rounded-full bg-emerald-50 px-3 py-1">
              <Text className="text-xs font-semibold text-emerald-700">{wallets.length} ví</Text>
            </View>
          </View>

          {wallets.length === 0 ? (
            <View className="rounded-[24px] bg-white p-6 shadow-sm">
              <EmptyState
                title="Chưa có ví nào"
                description="Tạo ví đầu tiên để bắt đầu theo dõi tài chính cá nhân trên mobile."
                action={<PrimaryButton label="Tải lại" variant="secondary" onPress={() => void refetch()} />}
              />
            </View>
          ) : (
            <View className="gap-3">
              {wallets.map((wallet) => (
                <WalletListItem
                  key={wallet.id}
                  wallet={wallet}
                  isToggling={isTogglingStatus}
                  onToggle={() => void toggleWalletStatus({ walletId: wallet.id, nextStatus: wallet.status === 1 ? 2 : 1 })}
                />
              ))}
            </View>
          )}
        </View>

        <View className="mt-6 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Sparkles size={16} color="#059669" />
            <Text className="font-semibold text-emerald-900">Khuyến nghị quản trị ví</Text>
          </View>
          <Text className="text-sm leading-6 text-emerald-800">
            Nên tách rõ ví an toàn và ví chi tiêu ngắn hạn, đồng thời rà soát hạn mức theo tuần để kiểm soát rủi ro vượt ngân sách.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
