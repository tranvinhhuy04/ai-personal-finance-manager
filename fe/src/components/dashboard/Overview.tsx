import { ChevronDown, RotateCcw } from 'lucide-react';
import { StatCard } from './StatCard';
import { DashboardData } from '@/hooks/useDashboardData';
import { motion } from 'motion/react';

export const Overview = ({ data }: { data: DashboardData['overview'] }) => {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Tổng quan</h1>
          <p className="text-sm text-gray-500">Dưới đây là tóm tắt dữ liệu tổng thể</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            Tháng này
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <RotateCcw className="w-4 h-4 text-gray-400" />
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
        <StatCard data={data.balance} />
        <StatCard data={data.savings} />
        <StatCard data={data.investment} />
      </motion.div>
    </section>
  );
};
