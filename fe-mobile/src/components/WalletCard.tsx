import React, { memo, useMemo } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Banknote, Landmark, Smartphone, Wallet2 } from 'lucide-react-native';

import { formatCurrency } from '../utils/formatCurrency';

export type WalletKind = 'card' | 'momo' | 'zalopay' | 'cash';

export interface WalletCardItem {
  id: string;
  name: string;
  balance: number;
  type: WalletKind;
  status?: 'Hoạt động' | 'Tạm khóa';
  limitLabel?: string;
}

interface WalletCardProps {
  wallet: WalletCardItem;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

const CARD_SHADOW: ViewStyle = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 6,
};

function buildWalletCode(id: string, name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return `${normalized.slice(0, 2) || 'WL'}${id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000'}`;
}

function resolveTheme(wallet: WalletCardItem) {
  const normalizedName = wallet.name.toLowerCase();

  if (wallet.type === 'momo' || normalizedName.includes('momo')) {
    return {
      colors: ['#ec4899', '#be185d', '#831843'] as const,
      label: 'Ví điện tử',
      icon: Smartphone,
    };
  }

  if (wallet.type === 'zalopay' || normalizedName.includes('zalo')) {
    return {
      colors: ['#06b6d4', '#0f766e', '#164e63'] as const,
      label: 'Ví điện tử',
      icon: Wallet2,
    };
  }

  if (wallet.type === 'cash' || normalizedName.includes('tiền mặt') || normalizedName.includes('tien mat')) {
    return {
      colors: ['#10b981', '#047857', '#134e4a'] as const,
      label: 'Tiền mặt',
      icon: Banknote,
    };
  }

  return {
    colors: ['#334155', '#1e293b', '#0f172a'] as const,
    label: 'Ngân hàng',
    icon: Landmark,
  };
}

export const WalletCard = memo(function WalletCard({ wallet, onPress, variant = 'default' }: WalletCardProps) {
  const theme = useMemo(() => resolveTheme(wallet), [wallet]);
  const walletCode = useMemo(() => buildWalletCode(wallet.id, wallet.name), [wallet.id, wallet.name]);
  const Icon = theme.icon;
  const sizeClass = variant === 'compact' ? 'h-40 w-[280px] p-4' : 'min-h-[156px] w-full p-4';

  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden rounded-[24px] ${variant === 'default' ? 'mb-4' : ''}`}
      style={CARD_SHADOW}
    >
      <LinearGradient colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className={`relative ${sizeClass}`}>
        <View className="absolute -right-6 -top-4 h-20 w-20 rounded-full bg-white/10" />
        <View className="absolute bottom-3 right-4 h-10 w-10 rounded-full border border-white/10" />

        <View className="flex-1 justify-between">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 flex-row items-center gap-3 pr-2">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                <Icon size={18} color="#ffffff" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-bold text-white" numberOfLines={1}>
                  {wallet.name}
                </Text>
                <Text className="mt-0.5 text-xs text-white/70">{theme.label}</Text>
              </View>
            </View>

            <Text className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-medium text-white/90">
              {wallet.status ?? 'Hoạt động'}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="mb-1 text-xs text-white/70">Số dư khả dụng</Text>
            <Text className="text-2xl font-extrabold tracking-tight text-white">{formatCurrency(wallet.balance)}</Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between border-t border-white/15 pt-3">
            <View>
              <Text className="text-[10px] uppercase tracking-[1.5px] text-white/60">Hạn mức</Text>
              <Text className="mt-1 text-xs font-medium text-white/85">{wallet.limitLabel ?? 'Không giới hạn'}</Text>
            </View>

            <View className="items-end">
              <Text className="text-[10px] uppercase tracking-[1.5px] text-white/60">Mã ví</Text>
              <Text className="mt-1 text-[10px] font-semibold tracking-[2px] text-white/85">{walletCode}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});
