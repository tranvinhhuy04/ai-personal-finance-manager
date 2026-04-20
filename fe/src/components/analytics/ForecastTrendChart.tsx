import React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@/contexts/theme-context';
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
  const { isDark } = useTheme();

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#cbd5e1' : '#64748b';
  const actualColor = isDark ? '#2dd4bf' : '#0f766e';
  const forecastColor = isDark ? '#fb7185' : '#f43f5e';

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            formatter={(value: unknown) => formatCurrency(toNumericValue(value))}
            contentStyle={{
              borderRadius: 16,
              borderColor: gridColor,
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#0f172a',
            }}
          />
          <Line type="monotone" dataKey="actual" name="Số dư thực tế" stroke={actualColor} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="forecast" name="Dự báo" stroke={forecastColor} strokeWidth={3} strokeDasharray="7 5" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
