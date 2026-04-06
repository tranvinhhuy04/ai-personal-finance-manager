import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Smartphone, Wallet, Banknote, Edit, Trash2 } from 'lucide-react';
import { WalletCurrency } from '@/hooks/useDashboardData';
import { cn, formatVND } from '@/lib/utils';
import { motion } from 'motion/react';

export const WalletCard: React.FC<{ data: WalletCurrency; logoSrc?: string | null }> = ({ data, logoSrc }) => {
  const { id, name, type, amount, status } = data;
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [logoSrc]);

  const isActive = status === 'Hoạt động';

  const walletCode = useMemo(() => {
    const normalizedName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    const prefix = normalizedName.slice(0, 2) || 'wv';
    const suffix = String(id ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(-2).toLowerCase() || '00';
    return `${prefix}${suffix}`;
  }, [id, name]);

  const getWalletStyle = () => {
    const normalizedName = name.toLowerCase();

    if (type === 'momo' || normalizedName.includes('momo')) {
      return {
        card: 'bg-white border-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.10)]',
        icon: <Smartphone className="w-4 h-4 text-pink-600" />,
        text: 'text-slate-900',
        statusActive: 'text-emerald-700 bg-emerald-100 border-emerald-200',
        displayType: 'Ví điện tử',
      };
    }

    if (type === 'zalopay' || normalizedName.includes('zalo')) {
      return {
        card: 'bg-white border-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.10)]',
        icon: <Wallet className="w-4 h-4 text-cyan-600" />,
        text: 'text-slate-900',
        statusActive: 'text-emerald-700 bg-emerald-100 border-emerald-200',
        displayType: 'Ví điện tử',
      };
    }

    if (type === 'cash' || normalizedName.includes('tiền mặt') || normalizedName.includes('tien mat') || normalizedName.includes('vietcombank')) {
      return {
        card: 'bg-white border-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.10)]',
        icon: <Banknote className="w-4 h-4 text-emerald-600" />,
        text: 'text-slate-900',
        statusActive: 'text-emerald-700 bg-emerald-100 border-emerald-200',
        displayType: type === 'cash' ? 'Tiền mặt' : 'Ngân hàng',
      };
    }

    if (normalizedName.includes('bidv') || normalizedName.includes('techcombank') || normalizedName.includes('tcb') || type === 'techcombank') {
      return {
        card: 'bg-white border-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.10)]',
        icon: <CreditCard className="w-4 h-4 text-blue-600" />,
        text: 'text-slate-900',
        statusActive: 'text-emerald-700 bg-emerald-100 border-emerald-200',
        displayType: 'Thẻ tín dụng',
      };
    }

    return {
      card: 'bg-white border-slate-200/80 shadow-[0_0_15px_rgba(148,163,184,0.10)]',
      icon: <CreditCard className="w-4 h-4 text-slate-500" />,
      text: 'text-slate-900',
      statusActive: 'text-emerald-700 bg-emerald-100 border-emerald-200',
      displayType: type === 'cash' ? 'Tiền mặt' : 'Ví cá nhân',
    };
  };

  const style = getWalletStyle();

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'p-5 rounded-2xl border shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:shadow-lg transition-shadow duration-300 group h-full flex flex-col justify-between',
        style.card,
      )}
    >
      <div>
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md shrink-0">
              {logoSrc && !hasImageError ? (
                <img
                  src={logoSrc}
                  alt={name}
                  className="w-8 h-8 object-contain rounded"
                  onError={() => setHasImageError(true)}
                />
              ) : (
                style.icon
              )}
            </div>
            <div className="min-w-0">
              <span className={cn('font-bold text-sm block truncate', style.text)}>{name}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{style.displayType}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-sky-600" title="Sửa ví">
              <Edit className="w-4 h-4" />
            </button>
            <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600" title="Xóa ví">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Số dư ví</p>
          <h3 className="mt-2 text-xl font-bold text-gray-900 tracking-tight">
            {formatVND(amount)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Số dư khả dụng</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <span
          className={cn(
            'text-[10px] font-semibold px-2.5 py-1 rounded-full border',
            isActive ? style.statusActive : 'text-orange-600 bg-orange-50 border-orange-100',
          )}
        >
          {status}
        </span>

        <span className="text-[11px] text-slate-500 font-medium">{walletCode}</span>
      </div>
    </motion.div>
  );
};
