import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CategoryItem {
  icon: string;
  name: string;
  value: number;
  color: string;
}

interface Props {
  total: number;
  categories: CategoryItem[];
}

function toNumericValue(value: unknown): number {
  if (Array.isArray(value)) {
    return Number(value[0] ?? 0) || 0;
  }

  return Number(value ?? 0) || 0;
}

export function CategoryChart({ total, categories }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={categories} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
              {categories.map((item) => (
                <Cell key={item.name} fill={item.color} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip formatter={(value: unknown) => formatCurrency(toNumericValue(value))} />
            <text x="50%" y="46%" textAnchor="middle" className="fill-slate-500 text-[12px] font-medium">
              Tổng chi tiêu
            </text>
            <text x="50%" y="55%" textAnchor="middle" className="fill-slate-900 text-[18px] font-bold">
              {formatCurrency(total)}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {categories.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p>
                </div>
              </div>

              <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
