import { ArrowUpRight, ArrowDownRight, MoreHorizontal, ArrowRight, Wallet, Calculator, FileText } from 'lucide-react';
import { StatData } from '@/hooks/useDashboardData';
import { cn, formatVND } from '@/lib/utils';
import { motion } from 'motion/react';

export const StatCard = ({ data }: { data: StatData }) => {
  const { title, subtitle, amount, growth, isPositive, isPrimary } = data;

  const getIcon = () => {
    if (title.includes('Số dư')) return <Wallet className="w-6 h-6" />;
    if (title.includes('Tiết kiệm')) return <Calculator className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        'p-6 rounded-3xl flex flex-col justify-between h-full transition-shadow duration-300 hover:shadow-xl',
        isPrimary
          ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/40 relative overflow-hidden group'
          : 'bg-white text-gray-900 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-gray-100'
      )}
    >
      {isPrimary && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-10 -mb-10 transition-transform duration-700 group-hover:scale-150"></div>
          {/* Subtle grid pattern for primary card */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm',
                isPrimary ? 'bg-white/20 text-white backdrop-blur-md border border-white/10' : 'bg-gray-50 text-gray-600 border border-gray-100'
              )}
            >
              {getIcon()}
            </div>
            <div>
              <h3 className={cn('font-semibold text-base', isPrimary ? 'text-white' : 'text-gray-900')}>
                {title}
              </h3>
              <p className={cn('text-xs mt-0.5', isPrimary ? 'text-emerald-100' : 'text-gray-500')}>
                {subtitle}
              </p>
            </div>
          </div>
          <button className={cn('p-1.5 rounded-full transition-colors', isPrimary ? 'hover:bg-white/20 text-white/70' : 'hover:bg-gray-100 text-gray-400')}>
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-end gap-3 mb-6">
          <h2 className={cn('text-3xl font-bold tracking-tight', isPrimary ? 'text-white' : 'text-gray-900')}>
            {formatVND(amount)}
          </h2>
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold mb-1 shadow-sm',
              isPrimary
                ? 'bg-white/20 text-white backdrop-blur-md border border-white/10'
                : isPositive
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
            )}
          >
            {isPositive ? '+' : '-'}{growth}%
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        </div>
      </div>

      <div className={cn('relative z-10 pt-4 border-t flex items-center justify-between group/link cursor-pointer', isPrimary ? 'border-white/20' : 'border-gray-100')}>
        <span className={cn('text-sm font-medium transition-colors', isPrimary ? 'text-emerald-50 group-hover/link:text-white' : 'text-gray-600 group-hover/link:text-gray-900')}>
          {isPrimary ? 'Xem chi tiết' : title.includes('Tiết kiệm') ? 'Xem tóm tắt' : 'Phân tích hiệu suất'}
        </span>
        <ArrowRight className={cn('w-4 h-4 transition-transform group-hover/link:translate-x-1', isPrimary ? 'text-emerald-50 group-hover/link:text-white' : 'text-gray-400 group-hover/link:text-gray-900')} />
      </div>
    </motion.div>
  );
};
