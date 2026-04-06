import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DashboardData } from '@/hooks/useDashboardData';
import { cn, formatVND } from '@/lib/utils';
import { motion } from 'motion/react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0]?.payload;

    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white p-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-gray-700 text-xs min-w-[140px]">
        <p className="font-medium text-gray-300 mb-2 pb-2 border-b border-gray-700">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400">Dòng tiền</span>
            <span className="font-semibold">{formatVND(payload[0]?.value ?? 0)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400">Dòng tiền vào</span>
            <span className="font-semibold">{formatVND(point?.inflow ?? 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const CashFlow = ({
  data,
  cashflowFilter = 'yearly',
  onCashflowFilterChange,
}: {
  data: DashboardData['cashFlow'];
  cashflowFilter?: 'monthly' | 'yearly';
  onCashflowFilterChange?: (filter: 'monthly' | 'yearly') => void;
}) => {
  const maxCashflow = Math.max(0, ...data.data.map((entry) => Number(entry.cashflow) || 0));

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] min-h-[360px] min-w-0 flex flex-col"
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-1">Dòng tiền</h2>
          <div className="text-3xl font-bold text-gray-900 tracking-tight">
            {formatVND(data.total)}
          </div>
        </div>
        <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button
            type="button"
            onClick={() => onCashflowFilterChange?.('monthly')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
              cashflowFilter === 'monthly'
                ? 'bg-[#046A38] text-white shadow-lg shadow-emerald-900/20'
                : 'bg-transparent text-gray-500 hover:text-gray-900'
            )}
          >
            Hàng tháng
          </button>
          <button
            type="button"
            onClick={() => onCashflowFilterChange?.('yearly')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5',
              cashflowFilter === 'yearly'
                ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/40 hover:brightness-110'
                : 'bg-gray-100 text-gray-500 hover:text-gray-900'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', cashflowFilter === 'yearly' ? 'bg-white/80' : 'bg-gray-400')} />
            Hàng năm
          </button>
        </div>
      </div>

      <div className="h-72 w-full min-w-0" style={{ width: '100%', height: '288px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
          <BarChart data={data.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              type="category"
              scale="band"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500, textAnchor: 'middle' }}
              dy={10}
            />
            <YAxis 
              width={80}
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => {
                const amount = Number(value) || 0;
                if (Math.abs(amount) >= 1000000) {
                  return `${amount / 1000000}Tr`;
                }
                return `${amount}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="cashflow" radius={[8, 8, 8, 8]}>
              {data.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={(Number(entry.cashflow) || 0) === maxCashflow ? '#059669' : '#A7F3D0'} 
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
};
