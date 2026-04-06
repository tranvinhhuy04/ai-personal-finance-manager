import React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactNumber, formatCurrency } from '@/lib/utils';

interface TrendPoint {
  label: string;
  actual?: number;
  forecast?: number;
}

interface Props {
  data: TrendPoint[];
}

function toNumericValue(value: unknown): number {
  if (Array.isArray(value)) {
    return Number(value[0] ?? 0) || 0;
  }

  return Number(value ?? 0) || 0;
}

export function ForecastTrendChart({ data }: Props) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            formatter={(value: unknown) => formatCurrency(toNumericValue(value))}
            contentStyle={{ borderRadius: 16, borderColor: '#e2e8f0' }}
          />
          <Line type="monotone" dataKey="actual" name="Số dư thực tế" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="forecast" name="Dự báo" stroke="#f43f5e" strokeWidth={3} strokeDasharray="7 5" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
