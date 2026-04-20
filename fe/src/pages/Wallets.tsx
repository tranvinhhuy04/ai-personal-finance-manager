import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CreditCard, Edit, Landmark, Lock, Plus, Trash2, Unlock, Wallet as WalletIcon } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { cn, formatCurrency } from '@/lib/utils';
import { CreateWalletModal } from '@/components/dashboard/CreateWalletModal';
import { EditWalletModal } from '@/components/dashboard/EditWalletModal';
import { useVietQRBanks, type VietQRBank } from '@/hooks/useVietQRBanks';
import type { Wallet as WalletItem } from '@/types/finance';

function getWalletLogo(walletType: string, walletName: string, banks: VietQRBank[] = []) {
  const normalizedType = (walletType || '').toLowerCase();
  const normalizedName = (walletName || '').toLowerCase();

  if (normalizedType.includes('momo') || normalizedName.includes('momo')) {
    return '/image/momo-logo.png';
  }

  if (normalizedType.includes('zalo') || normalizedName.includes('zalopay') || normalizedName.includes('zalo pay')) {
    return '/image/zalopay-png.png';
  }

  if (normalizedType.includes('cash') || normalizedName.includes('tiền mặt') || normalizedName.includes('tien mat')) {
    return '/image/cash-logo.png';
  }

  if (normalizedType.includes('card') || normalizedType.includes('bank')) {
    const matchedBank = banks.find((bank) => {
      const bankName = bank.name.toLowerCase();
      const shortName = bank.shortName.toLowerCase();
      const bankCode = bank.code.toLowerCase();

      return normalizedName.includes(bankName) || normalizedName.includes(shortName) || normalizedName.includes(bankCode);
    });

    return matchedBank?.logo ?? null;
  }

  return null;
}

function getWalletStyle(type: string) {
  const styles: Record<string, { card: string; badge: string; glow: string }> = {
    CARD: {
      card: 'border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:border-sky-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/25',
      badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
      glow: 'from-sky-400/25 via-blue-300/10 to-transparent dark:from-sky-500/20 dark:via-blue-400/10',
    },
    MOMO: {
      card: 'border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 dark:border-fuchsia-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-fuchsia-950/25',
      badge: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/35 dark:text-fuchsia-300',
      glow: 'from-fuchsia-400/25 via-pink-300/10 to-transparent dark:from-fuchsia-500/20 dark:via-pink-400/10',
    },
    ZALOPAY: {
      card: 'border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:border-cyan-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/25',
      badge: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/35 dark:text-cyan-300',
      glow: 'from-cyan-400/25 via-blue-300/10 to-transparent dark:from-cyan-500/20 dark:via-blue-400/10',
    },
    CASH: {
      card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/25',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
      glow: 'from-emerald-400/25 via-teal-300/10 to-transparent dark:from-emerald-500/20 dark:via-teal-400/10',
    },
  };

  return styles[type] ?? {
    card: 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800',
    badge: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    glow: 'from-slate-400/20 via-slate-300/10 to-transparent dark:from-slate-500/15 dark:via-slate-400/10',
  };
}

function getWalletTypeLabel(type: string) {
  const labels: Record<string, string> = {
    CARD: 'Ngân hàng',
    MOMO: 'MoMo',
    ZALOPAY: 'ZaloPay',
    CASH: 'Tiền mặt',
  };
  return labels[type] || type;
}

function getStatusBadge(status: number) {
  if (status === 1) {
    return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Hoạt động</span>;
  }

  if (status === 2) {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">Khóa</span>;
  }

  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Vô hiệu</span>;
}

function renderFallbackIcon(type: string) {
  if (type === 'CARD') return <CreditCard className="h-5 w-5 text-sky-700 dark:text-sky-300" />;
  if (type === 'CASH') return <Landmark className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />;
  return <WalletIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />;
}

export const Wallets = () => {
  const { banks } = useVietQRBanks(true);
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);

  const {
    data: wallets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => apiClient.getWallets(),
    staleTime: 60 * 1000,
  });

  const editingWallet = useMemo<WalletItem | null>(
    () => wallets.find((wallet) => wallet.id === editingWalletId) ?? null,
    [editingWalletId, wallets]
  );

  const handleWalletMutationSuccess = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['wallets'] });
  }, [queryClient]);

  const errorMessage = error instanceof Error ? error.message : 'Vui lòng thử lại sau';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ví của tôi</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quản lý số dư ví và trạng thái sử dụng một cách trực quan.</p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-5 w-5" />
            Thêm ví mới
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Đang tải dữ liệu ví...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 py-12 text-center dark:border-red-900/60 dark:bg-red-950/30">
            <p className="font-medium text-red-700 dark:text-red-300">Không thể tải danh sách ví</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300/90">{errorMessage}</p>
          </div>
        ) : wallets.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {wallets.map((wallet) => {
              const style = getWalletStyle(wallet.walletType);
              const logo = getWalletLogo(wallet.walletType, wallet.walletName, banks);

              return (
                <motion.div
                  key={wallet.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className={cn(
                    'relative overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] transition-all hover:shadow-[0_26px_60px_-32px_rgba(15,23,42,0.38)] dark:shadow-[0_20px_56px_-32px_rgba(2,6,23,0.95)] dark:hover:shadow-[0_28px_64px_-32px_rgba(2,6,23,0.98)]',
                    style.card,
                  )}
                >
                  <div className={cn('pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl', style.glow)} />

                  <div className="relative space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
                          {logo ? (
                            <img src={logo} alt={wallet.walletName} className="h-8 w-8 object-contain" />
                          ) : (
                            renderFallbackIcon(wallet.walletType)
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{wallet.walletName}</h3>
                          <p className={cn('mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', style.badge)}>
                            {getWalletTypeLabel(wallet.walletType)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingWalletId(wallet.id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-sky-600 dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-sky-300"
                          title="Sửa ví"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-red-600 dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-red-300"
                          title="Xóa ví"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-5 text-center shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Số dư ví</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-[32px]">
                        {formatCurrency(parseFloat(wallet.balance))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 dark:border-slate-700">
                      <div>{getStatusBadge(wallet.status)}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {wallet.status === 1 ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        v{wallet.version}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 py-12 text-center dark:bg-slate-900">
            <p className="mb-4 text-slate-500 dark:text-slate-400">Bạn chưa có ví nào</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Tạo ví đầu tiên
            </button>
          </div>
        )}
      </motion.div>

      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleWalletMutationSuccess}
      />

      {editingWallet && (
        <EditWalletModal
          wallet={editingWallet}
          onClose={() => setEditingWalletId(null)}
          onSuccess={handleWalletMutationSuccess}
        />
      )}
    </>
  );
};
