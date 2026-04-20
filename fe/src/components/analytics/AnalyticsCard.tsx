import React from 'react';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  description?: string;
  badge?: string;
  className?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function AnalyticsCard({
  title,
  description,
  badge,
  className,
  headerRight,
  children,
}: AnalyticsCardProps) {
  return (
    <section className={cn('rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          {headerRight}
          {badge ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}
