import React from 'react';
import { MoreVertical, CreditCard, Smartphone, Wallet, Banknote } from 'lucide-react';
import { WalletCurrency } from '@/hooks/useDashboardData';
import { cn, formatVND } from '@/lib/utils';
import { motion } from 'motion/react';

export const WalletCard: React.FC<{ data: WalletCurrency }> = ({ data }) => {
  const { name, type, amount, limit, status } = data;
  const isActive = status === 'Hoạt động';

  const getWalletStyle = () => {
    switch (type) {
      case 'techcombank':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-white border-red-100',
          iconBg: 'bg-red-600 text-white shadow-red-200',
          icon: <CreditCard className="w-4 h-4" />,
          text: 'text-red-900',
          statusActive: 'text-red-600 bg-red-50 border-red-100',
          displayType: 'Thẻ tín dụng'
        };
      case 'momo':
        return {
          bg: 'bg-gradient-to-br from-pink-50 to-white border-pink-100',
          iconBg: 'bg-[#A50064] text-white shadow-pink-200',
          icon: <Smartphone className="w-4 h-4" />,
          text: 'text-[#A50064]',
          statusActive: 'text-[#A50064] bg-pink-50 border-pink-100',
          displayType: 'Ví điện tử'
        };
      case 'zalopay':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-white border-blue-100',
          iconBg: 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-blue-200',
          icon: <Wallet className="w-4 h-4" />,
          text: 'text-blue-900',
          statusActive: 'text-blue-600 bg-blue-50 border-blue-100',
          displayType: 'Ví điện tử'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100',
          iconBg: 'bg-emerald-600 text-white shadow-emerald-200',
          icon: <Banknote className="w-4 h-4" />,
          text: 'text-emerald-900',
          statusActive: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          displayType: 'Tiền mặt'
        };
    }
  };

  const style = getWalletStyle();

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("p-5 rounded-2xl border shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:shadow-lg transition-shadow duration-300 group", style.bg)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md", style.iconBg)}>
            {style.icon}
          </div>
          <div>
            <span className={cn("font-bold text-sm block", style.text)}>{name}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{style.displayType}</span>
          </div>
        </div>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          {formatVND(amount)}
        </h3>
        <p className="text-xs text-gray-500 mt-1">Hạn mức {limit}</p>
      </div>

      <div className="flex items-center">
        <span
          className={cn(
            'text-[10px] font-semibold px-2 py-1 rounded-full border',
            isActive ? style.statusActive : 'text-orange-600 bg-orange-50 border-orange-100'
          )}
        >
          {status}
        </span>
      </div>
    </motion.div>
  );
};
