import { useState } from 'react';
import { Plus } from 'lucide-react';
import { WalletCard } from './WalletCard';
import { DashboardData } from '@/hooks/useDashboardData';
import { motion } from 'motion/react';
import { AddWalletModal } from './AddWalletModal';

export const MyWallet = ({ data }: { data: DashboardData['wallet'] }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <motion.section 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] h-full flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">Ví của tôi</h2>
            <p className="text-xs text-gray-500 font-medium">{data.exchangeRate}</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1">
          {data.currencies.map((currency) => (
            <WalletCard key={currency.id} data={currency} />
          ))}
        </div>
      </motion.section>
      <AddWalletModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
};
