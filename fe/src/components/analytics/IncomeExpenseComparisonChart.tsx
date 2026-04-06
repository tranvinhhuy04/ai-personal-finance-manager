import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={78}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => formatCompactNumber(Number(value))}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              formatCurrency(toNumericValue(value)),
              String(name ?? '') === 'income' ? 'Thu nhập' : 'Chi tiêu',
            ]}
            labelFormatter={(label) => `Mốc: ${String(label ?? '')}`}
            contentStyle={{ borderRadius: 16, borderColor: '#e2e8f0' }}
          />
          <Area type="monotone" dataKey="income" stroke="#059669" fill="url(#analyticsIncomeGradient)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="expense" stroke="#e11d48" fill="url(#analyticsExpenseGradient)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
