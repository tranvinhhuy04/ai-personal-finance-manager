import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DashboardData } from '@/hooks/useDashboardData';
import { useTheme } from '@/contexts/theme-context';
import { cn, formatVND } from '@/lib/utils';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const inflowEntry = payload.find((p: any) => p.dataKey === 'cashflow');
    const outflowEntry = payload.find((p: any) => p.dataKey === 'outflow');

    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white p-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-gray-700 text-xs min-w-[180px]">
        <p className="font-medium text-gray-300 mb-2 pb-2 border-b border-gray-700">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Tiền vào
            </span>
            <span className="font-semibold">{formatVND(inflowEntry?.value ?? 0)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Tiền ra
            </span>
            <span className="font-semibold">{formatVND(outflowEntry?.value ?? 0)}</span>
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
  onRefresh,
  isRefreshing = false,
}: {
  data: DashboardData['cashFlow'];
  cashflowFilter?: 'monthly' | 'yearly';
  onCashflowFilterChange?: (filter: 'monthly' | 'yearly') => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) => {
  const { isDark } = useTheme();
  const gridStroke = isDark ? '#334155' : '#f1f5f9';
  const axisTick = isDark ? '#cbd5e1' : '#94a3b8';

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="min-h-[360px] min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="mb-1 text-sm font-medium text-gray-500 dark:text-slate-400">Dòng tiền</h2>
          <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {formatVND(data.total)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex items-center rounded-xl border border-gray-100 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onCashflowFilterChange?.('monthly')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                cashflowFilter === 'monthly'
                  ? 'bg-[#046A38] text-white shadow-lg shadow-emerald-900/20'
                  : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white'
              )}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => onCashflowFilterChange?.('yearly')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                cashflowFilter === 'yearly'
                  ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/40 hover:brightness-110'
                  : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white'
              )}
            >
              Năm nay
            </button>
          </div>
          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Làm mới dữ liệu"
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:hover:text-emerald-400 dark:hover:bg-slate-700"
          >
            <RotateCcw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="h-72 w-full min-w-0" style={{ width: '100%', height: '288px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
          <ComposedChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: axisTick, fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              width={80}
              axisLine={false}
              tickLine={false}
              tick={{ fill: axisTick, fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => {
                const amount = Number(value) || 0;
                if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}Tỷ`;
                if (Math.abs(amount) >= 1_000_000) return `${Math.round(amount / 1_000_000)}Tr`;
                return `${amount}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
            <Legend
              formatter={(value) => value === 'cashflow' ? 'Tiền vào' : 'Tiền ra'}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            {/* Inflow — Emerald Bar */}
            <Bar
              dataKey="cashflow"
              name="cashflow"
              fill="#10b981"
              radius={[6, 6, 6, 6]}
              className="transition-all duration-300 hover:opacity-80"
            />
            {/* Outflow — Rose Line */}
            <Line
              type="monotone"
              dataKey="outflow"
              name="outflow"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#f43f5e' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
};

