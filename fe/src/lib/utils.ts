import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactNumber(value: number) {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);

  const compact = (divisor: number, suffix: string) => {
    const scaled = amount / divisor;
    const hasFraction = Math.abs(scaled) < 10 && Math.abs(scaled % 1) > 0;
    return `${hasFraction ? scaled.toFixed(1).replace(/\.0$/, '') : Math.round(scaled)} ${suffix}`;
  };

  if (abs >= 1_000_000_000) return compact(1_000_000_000, 'Tỷ');
  if (abs >= 1_000_000) return compact(1_000_000, 'Tr');
  if (abs >= 1_000) return compact(1_000, 'k');
  return `${Math.round(amount)}`;
}

export const formatVND = formatCurrency;
