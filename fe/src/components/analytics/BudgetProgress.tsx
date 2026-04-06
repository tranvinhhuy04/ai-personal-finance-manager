import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';

interface BudgetItem {
  category: string;
  spent: number;
  limit: number;
}

interface Props {
  items: BudgetItem[];
}

export function BudgetProgress({ items }: Props) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const ratio = item.limit > 0 ? Math.min(100, Math.round((item.spent / item.limit) * 100)) : 0;
        const isCritical = ratio >= 80;

        return (
          <div key={item.category} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">{item.category}</p>
              <span className={cn('text-xs font-semibold', isCritical ? 'text-rose-600' : 'text-emerald-600')}>
                {ratio}%
              </span>
            </div>

            <p className="mb-2 text-xs text-slate-500">
              {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
            </p>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn('h-full rounded-full transition-all', isCritical ? 'bg-rose-500' : 'bg-emerald-500')}
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
