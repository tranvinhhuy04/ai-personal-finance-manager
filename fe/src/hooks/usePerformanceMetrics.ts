import { useMemo } from 'react';
import type { SavingPackage } from '@/types/finance';

export interface SavingsMetrics {
  totalCurrent: number;
  totalTarget: number;
  estimatedInterest: number;
  growthRate: number; // % annualized estimate
}

export interface InvestmentMetrics {
  totalCurrent: number;
  totalDeposited: number;
  returnAmount: number;
  returnRate: number; // %
  riskScore: 'Thấp' | 'Trung bình' | 'Cao';
  allocationPercent: number; // % of (savings + investment)
}

const FALLBACK_SAVINGS_ANNUAL_RATE = 0.065; // 6.5% p.a. — used when transaction history is insufficient

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000));
}

/**
 * @param savings       Active SAVING packages from the API.
 * @param cagrOverride  Optional annualised growth rate (%) computed by useSavingsGrowth.
 *                      When provided and valid, replaces the static fallback rate.
 */
export function useSavingsMetrics(savings: SavingPackage[], cagrOverride?: number): SavingsMetrics {
  return useMemo(() => {
    const active = savings.filter((s) => s.type === 'SAVING');

    const totalCurrent = active.reduce((sum, s) => sum + (s.currentAmount ?? 0), 0);
    const totalTarget = active.reduce((sum, s) => sum + (s.targetAmount ?? 0), 0);

    // Use data-driven CAGR when available; fall back to bank estimate
    const annualRate =
      cagrOverride != null && Number.isFinite(cagrOverride) && cagrOverride > 0
        ? cagrOverride / 100
        : FALLBACK_SAVINGS_ANNUAL_RATE;

    // Estimated interest: principal × rate × (elapsed days / 365), per package
    const now = new Date().toISOString();
    const estimatedInterest = active.reduce((sum, s) => {
      const days = daysBetween(s.startDate, now);
      return sum + (s.currentAmount ?? 0) * annualRate * (days / 365);
    }, 0);

    const growthRate = annualRate * 100; // display as %

    return { totalCurrent, totalTarget, estimatedInterest, growthRate };
  }, [savings, cagrOverride]);
}

export function useInvestmentMetrics(
  investments: SavingPackage[],
  savingsTotal: number,
): InvestmentMetrics {
  return useMemo(() => {
    const active = investments.filter((s) => s.type === 'INVESTMENT');

    const totalCurrent = active.reduce((sum, s) => sum + (s.currentAmount ?? 0), 0);

    // Approximate "deposited" as targetAmount when available, else currentAmount as floor
    const totalDeposited = active.reduce((sum, s) => {
      const deposited = s.targetAmount && s.targetAmount > 0 ? Math.min(s.targetAmount, s.currentAmount) : s.currentAmount;
      return sum + deposited;
    }, 0);

    const returnAmount = totalCurrent - totalDeposited;
    const returnRate = totalDeposited > 0 ? (returnAmount / totalDeposited) * 100 : 0;

    // Risk: simple heuristic based on return volatility
    const absReturn = Math.abs(returnRate);
    const riskScore: InvestmentMetrics['riskScore'] =
      absReturn > 15 ? 'Cao' : absReturn > 5 ? 'Trung bình' : 'Thấp';

    const totalPortfolio = savingsTotal + totalCurrent;
    const allocationPercent = totalPortfolio > 0 ? (totalCurrent / totalPortfolio) * 100 : 0;

    return { totalCurrent, totalDeposited, returnAmount, returnRate, riskScore, allocationPercent };
  }, [investments, savingsTotal]);
}
