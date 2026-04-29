import { Plus } from 'lucide-react';
import { WalletCard } from './WalletCard';
import { DashboardData } from '@/hooks/useDashboardData';
import { motion } from 'motion/react';
import { useVietQRBanks, type VietQRBank } from '@/hooks/useVietQRBanks';
import { useMemo, useState } from 'react';
import type { Wallet } from '@/types/finance';
import { apiClient } from '@/lib/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EditWalletModal } from './EditWalletModal';

function getWalletLogo(walletName: string, banks: VietQRBank[] = []) {
  const normalizedName = (walletName || '').toLowerCase();

  if (normalizedName.includes('momo')) {
    return '/image/momo-logo.png';
  }

  if (normalizedName.includes('zalopay') || normalizedName.includes('zalo pay')) {
    return '/image/zalopay-png.png';
  }

  if (normalizedName.includes('tiền mặt') || normalizedName.includes('tien mat') || normalizedName.includes('cash')) {
    return '/image/cash-logo.png';
  }

  const matchedBank = banks.find((bank) => {
    const bankName = bank.name.toLowerCase();
    const shortName = bank.shortName.toLowerCase();
    const bankCode = bank.code.toLowerCase();

    return normalizedName.includes(bankName) || normalizedName.includes(shortName) || normalizedName.includes(bankCode);
  });

  return matchedBank?.logo ?? null;
}

interface MyWalletProps {
  data: DashboardData['wallet'];
  rawWallets: Wallet[];
  onAddWallet: () => void;
  onWalletChanged?: () => Promise<void>;
}

export const MyWallet = ({ data, rawWallets, onAddWallet, onWalletChanged }: MyWalletProps) => {
  const { banks } = useVietQRBanks(true);
  const queryClient = useQueryClient();
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Top 4 wallets by balance (descending)
  const topWallets = useMemo(() => {
    return [...data.currencies]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [data.currencies]);

  // Prefetch hasTransactions per wallet
  const walletIds = topWallets.map((w) => w.id);
  const txChecks = useQuery({
    queryKey: ['wallets', 'hasTransactions', ...walletIds],
    queryFn: async () => {
      const results = await Promise.all(
        walletIds.map((id) => apiClient.hasWalletTransactions(id))
      );
      return Object.fromEntries(walletIds.map((id, i) => [id, results[i]]));
    },
    enabled: walletIds.length > 0,
    staleTime: 30 * 1000,
  });

  const hasTransactionsMap: Record<string, boolean> = txChecks.data ?? {};

  const handleDeactivate = async (walletId: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 2 : 1; // toggle active/locked
    try {
      await apiClient.updateWalletStatus(walletId, newStatus);
      await queryClient.invalidateQueries({ queryKey: ['wallets'] });
      await onWalletChanged?.();
    } catch {
      // silent
    }
  };

  const handleDelete = async (walletId: string) => {
    if (!confirm('Bạn có chắc muốn xóa ví này không?')) return;
    try {
      await apiClient.deleteWallet(walletId);
      await queryClient.invalidateQueries({ queryKey: ['wallets'] });
      await onWalletChanged?.();
    } catch {
      // silent
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-full rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="mb-1 text-xl font-bold tracking-tight text-gray-900 dark:text-white">Ví của tôi</h2>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{data.exchangeRate}</p>
        </div>
        <button
          onClick={onAddWallet}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <Plus className="w-4 h-4" />
          Thêm mới
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 auto-rows-fr">
        {topWallets.map((currency) => {
          const raw = rawWallets.find((w) => w.id === currency.id);
          return (
            <WalletCard
              key={currency.id}
              data={currency}
              logoSrc={getWalletLogo(currency.name, banks)}
              hasTransactions={hasTransactionsMap[currency.id] ?? false}
              onEdit={() => raw && setEditingWallet(raw)}
              onDeactivate={() => raw && handleDeactivate(raw.id, raw.status)}
              onDelete={() => handleDelete(currency.id)}
            />
          );
        })}
      </div>

      {editingWallet && (
        <EditWalletModal
          wallet={editingWallet}
          onClose={() => setEditingWallet(null)}
          onSuccess={async () => {
            setEditingWallet(null);
            await queryClient.invalidateQueries({ queryKey: ['wallets'] });
            await onWalletChanged?.();
          }}
        />
      )}
    </motion.section>
  );
};
