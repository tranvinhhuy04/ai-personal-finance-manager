import { ChevronDown, RotateCcw } from 'lucide-react';
import { StatCard } from './StatCard';
import { DashboardData } from '@/hooks/useDashboardData';
import { motion } from 'motion/react';
import type { SavingsMetrics, InvestmentMetrics } from '@/hooks/usePerformanceMetrics';
import { formatVND } from '@/lib/utils';

interface OverviewProps {
  data: DashboardData['overview'];
  savingsMetrics?: SavingsMetrics;
  investmentMetrics?: InvestmentMetrics;
}

export const Overview = ({ data, savingsMetrics, investmentMetrics }: OverviewProps) => {
  const savingsExtras = savingsMetrics
    ? [
        {
          label: 'Lãi dự tính',
          value: formatVND(savingsMetrics.estimatedInterest),
        },
        {
          label: 'Tốc độ tăng trưởng',
          value: `${savingsMetrics.growthRate.toFixed(2)}%/năm`,
        },
      ]
    : undefined;

  const investmentExtras = investmentMetrics
    ? [
        {
          label: 'Lợi nhuận',
          value: `${investmentMetrics.returnRate >= 0 ? '+' : ''}${investmentMetrics.returnRate.toFixed(2)}% (${formatVND(investmentMetrics.returnAmount)})`,
        },
        {
          label: 'Rủi ro',
          value: investmentMetrics.riskScore,
        },
        {
          label: 'Phân bổ danh mục',
          value: `${investmentMetrics.allocationPercent.toFixed(1)}% tổng tài sản`,
        },
      ]
    : undefined;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Tổng quan</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Dưới đây là tóm tắt dữ liệu tổng thể</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
            Tháng này
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-400" />
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
            <RotateCcw className="w-4 h-4 text-gray-400 dark:text-slate-400" />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <StatCard data={data.balance} detailPath="/wallets" />
        <StatCard data={data.savings} extras={savingsExtras} detailPath="/savings" />
        <StatCard data={data.investment} extras={investmentExtras} detailPath="/investments" />
      </motion.div>
    </section>
  );
};
