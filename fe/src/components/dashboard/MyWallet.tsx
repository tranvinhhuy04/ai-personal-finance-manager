import { Plus } from 'lucide-react';
import { WalletCard } from './WalletCard';
import { DashboardData } from '@/hooks/useDashboardData';
import { motion } from 'motion/react';
import { useVietQRBanks, type VietQRBank } from '@/hooks/useVietQRBanks';

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

export const MyWallet = ({ data, onAddWallet }: { data: DashboardData['wallet']; onAddWallet: () => void }) => {
  const { banks } = useVietQRBanks(true);

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
          {data.currencies.map((currency) => (
            <WalletCard key={currency.id} data={currency} logoSrc={getWalletLogo(currency.name, banks)} />
          ))}
        </div>
      </motion.section>
  );
};
