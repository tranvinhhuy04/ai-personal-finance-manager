import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financeApi } from '../api/finance';
import type { CreateWalletInput, Wallet } from '../types/finance';

// Parse số dư từ string/number, xử lý dấu phẩy và khoảng trắng (phòng ngừa API trả về '1,500,000').
function parseBalance(value: unknown): number {
  const normalized = String(value ?? '0').replace(/,/g, '').replace(/\s/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useWallets() {
  const queryClient = useQueryClient();
  // filter local: 'all' | 'active' | 'locked' – lọc phía client, không gọi lại API
  const [filter, setFilter] = useState<'all' | 'active' | 'locked'>('all');

  const query = useQuery({
    queryKey: ['mobile-wallets'],
    queryFn: () => financeApi.getWallets(),
    staleTime: 60_000, // Cache 60 giây
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateWalletInput) => financeApi.createWallet(input),
    // Sau khi tạo ví thành công, invalidate cache để refetch danh sách mới
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-wallets'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ walletId, nextStatus }: { walletId: string; nextStatus: number }) =>
      financeApi.updateWalletStatus(walletId, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-wallets'] });
    },
  });

  const sourceWallets = query.data ?? [];
  // useMemo: chỉ lọc lại khi filter hoặc danh sách gốc thay đổi
  const wallets = useMemo(() => {
    if (filter === 'active') return sourceWallets.filter((wallet) => wallet.status === 1);
    if (filter === 'locked') return sourceWallets.filter((wallet) => wallet.status !== 1);
    return sourceWallets;
  }, [filter, sourceWallets]);

  // summary: thống kê nhanh tổng số dư, số ví hoạt động/khóa – hiển thị trên header Dashboard
  const summary = useMemo(() => {
    const totalBalance = sourceWallets.reduce((sum, wallet) => sum + parseBalance(wallet.balance), 0);
    const activeCount = sourceWallets.filter((wallet) => wallet.status === 1).length;

    return {
      totalBalance,
      totalCount: sourceWallets.length,
      activeCount,
      inactiveCount: Math.max(sourceWallets.length - activeCount, 0),
    };
  }, [sourceWallets]);

  return {
    wallets,
    rawWallets: sourceWallets,
    summary,
    filter,
    setFilter,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    isDemoMode: false,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    createWallet: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    toggleWalletStatus: toggleStatusMutation.mutateAsync,
    isTogglingStatus: toggleStatusMutation.isPending,
  };
}

export function toWalletCardItem(wallet: Wallet) {
  const typeMap: Record<string, 'card' | 'momo' | 'zalopay' | 'cash'> = {
    CARD: 'card',
    MOMO: 'momo',
    ZALOPAY: 'zalopay',
    CASH: 'cash',
  };

  return {
    id: wallet.id,
    name: wallet.walletName,
    balance: Number(wallet.balance || 0),
    type: typeMap[wallet.walletType] ?? 'card',
    status: wallet.status === 1 ? 'Hoạt động' as const : 'Tạm khóa' as const,
    limitLabel: wallet.walletType === 'CARD' ? '250tr / tháng' : 'Không giới hạn',
  };
}
