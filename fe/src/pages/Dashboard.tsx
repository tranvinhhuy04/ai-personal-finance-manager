import { memo, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { cn, formatVND } from '@/lib/utils';

const CATEGORY_COLORS = ['#0f766e', '#0ea5e9', '#f97316', '#eab308', '#14b8a6', '#84cc16', '#f43f5e'];

const CurrencyTooltip = memo(function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-lg px-3 py-2">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{formatVND(Number(entry.value) || 0)}</span>
          </p>
        ))}
      </div>
    </div>
  );
});

const TrendChart = memo(function TrendChart({ data }: { data: any[] }) {
  return (
    <div className="h-[340px] w-full min-w-0" style={{ width: '100%', minHeight: 320 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={280}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            minTickGap={18}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            width={80}
            tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="totalIncome" name="Thu nhập" stroke="#059669" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="totalExpense" name="Chi tiêu" stroke="#dc2626" strokeWidth={2.5} dot={false} />
          <Bar dataKey="netCashFlow" name="Dòng tiền ròng" fill="#0284c7" radius={[6, 6, 0, 0]} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

const CategoryChart = memo(function CategoryChart({ data }: { data: any[] }) {
  return (
    <div className="h-[340px] w-full min-w-0" style={{ width: '100%', minHeight: 320 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={116}
            paddingAngle={3}
            cx="50%"
            cy="50%"
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CurrencyTooltip />} />
          <Legend formatter={(value) => <span className="text-xs text-gray-700">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[380px] rounded-3xl bg-gray-200 animate-pulse" />
        <div className="h-[380px] rounded-3xl bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');

  const { data, isLoading, isError, error, chartData } = useAnalytics({
    month: selectedMonth || undefined,
    walletId: selectedWallet || undefined,
  });

  const monthOptions = useMemo(() => {
    return (data?.trend ?? []).map((point) => ({ value: point.month, label: point.month }));
  }, [data]);

  const walletOptions = useMemo(() => {
    return (data?.summary.byWallet ?? []).map((wallet) => ({
      value: wallet.wallet_id,
      label: wallet.wallet_name,
    }));
  }, [data]);

  const trendData = useMemo(() => {
    return chartData.trend.map((point) => ({
      ...point,
      monthLabel: point.month.slice(5),
    }));
  }, [chartData.trend]);

  const categoryData = useMemo(() => {
    return chartData.categoryBreakdown.map((category) => ({
      name: category.category_name,
      value: category.total_amount,
    }));
  }, [chartData.categoryBreakdown]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-5 h-5" />
          Không tải được dữ liệu phân tích
        </div>
        <p className="mt-2 text-sm text-red-600">{error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}</p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Dashboard Phan tich</h1>
          <p className="text-sm text-gray-500 mt-1">Theo doi xu huong thu chi va cau truc danh muc chi tieu.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            <option value="">Tat ca thang</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            value={selectedWallet}
            onChange={(event) => setSelectedWallet(event.target.value)}
          >
            <option value="">Tat ca vi</option>
            {walletOptions.map((wallet) => (
              <option key={wallet.value} value={wallet.value}>
                {wallet.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Tong thu nhap" value={data?.summary.totalIncome ?? 0} tone="income" />
        <SummaryCard label="Tong chi tieu" value={data?.summary.totalExpense ?? 0} tone="expense" />
        <SummaryCard label="Dong tien rong" value={data?.summary.netCashFlow ?? 0} tone="net" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Xu huong thu nhap, chi tieu, dong tien rong">
          <TrendChart data={trendData} />
        </ChartCard>

        <ChartCard title="Co cau chi tieu theo danh muc (thang hien tai)">
          {categoryData.length > 0 ? (
            <CategoryChart data={categoryData} />
          ) : (
            <div className="h-[340px] rounded-2xl border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
              Chua co du lieu danh muc trong ky nay.
            </div>
          )}
        </ChartCard>
      </div>
    </motion.section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'income' | 'expense' | 'net';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-4 border shadow-sm',
        tone === 'income' && 'bg-emerald-50 border-emerald-100',
        tone === 'expense' && 'bg-rose-50 border-rose-100',
        tone === 'net' && 'bg-sky-50 border-sky-100'
      )}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-900">{formatVND(value)}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm min-w-0">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
