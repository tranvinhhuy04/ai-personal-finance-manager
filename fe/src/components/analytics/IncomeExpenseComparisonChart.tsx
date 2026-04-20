import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
import { formatCompactNumber, formatCurrency } from '@/lib/utils';

interface ComparisonPoint {
  label: string;
  income: number;
  expense: number;
}

interface Props {
  data: ComparisonPoint[];
}

function toNumericValue(value: unknown): number {
  if (Array.isArray(value)) {
    return Number(value[0] ?? 0) || 0;
  }

  return Number(value ?? 0) || 0;
}

export function IncomeExpenseComparisonChart({ data }: Props) {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#cbd5e1' : '#64748b';
  const incomeStroke = isDark ? '#34d399' : '#059669';
  const expenseStroke = isDark ? '#fb7185' : '#e11d48';

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="analyticsIncomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="analyticsExpenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={78}
            tick={{ fill: axisColor, fontSize: 12 }}
            tickFormatter={(value) => formatCompactNumber(Number(value))}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              formatCurrency(toNumericValue(value)),
              String(name ?? '') === 'income' ? 'Thu nhập' : 'Chi tiêu',
            ]}
            labelFormatter={(label) => `Mốc: ${String(label ?? '')}`}
            contentStyle={{
              borderRadius: 16,
              borderColor: gridColor,
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#0f172a',
            }}
          />
          <Area type="monotone" dataKey="income" stroke={incomeStroke} fill="url(#analyticsIncomeGradient)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="expense" stroke={expenseStroke} fill="url(#analyticsExpenseGradient)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
