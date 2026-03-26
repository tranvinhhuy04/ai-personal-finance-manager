import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DashboardData } from '@/hooks/useDashboardData';
import { formatVND } from '@/lib/utils';
import { motion } from 'motion/react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white p-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-gray-700 text-xs min-w-[140px]">
        <p className="font-medium text-gray-300 mb-2 pb-2 border-b border-gray-700">Tháng {label}, 2026</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400">Dòng tiền</span>
            <span className="font-semibold">{formatVND(payload[0].value)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400">Dòng tiền vào</span>
            <span className="font-semibold">{formatVND(payload[1].value)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const CashFlow = ({ data }: { data: DashboardData['cashFlow'] }) => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-1">Dòng tiền</h2>
          <div className="text-3xl font-bold text-gray-900 tracking-tight">
            {formatVND(data.total)}
          </div>
        </div>
        <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-colors">
            Hàng tháng
          </button>
          <button className="px-4 py-1.5 text-sm font-medium bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-lg shadow-lg shadow-emerald-900/40 transition-all hover:brightness-110 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
            Hàng năm
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => `${value / 1000000}M`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="cashflow" radius={[8, 8, 8, 8]}>
              {data.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.month === 'Thg 3' || entry.month === 'Mar' ? '#047857' : '#e2f0e9'} 
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>
            {/* Hidden bar for inflow data in tooltip */}
            <Bar dataKey="inflow" fill="transparent" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
};
