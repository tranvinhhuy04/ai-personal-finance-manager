import { useMemo } from 'react';
import type { SavingPackage, Transaction } from '@/types/finance';

export interface SavingsGrowthResult {
  /** Compound Annual Growth Rate in % (annualised Geometric Mean of monthly returns) */
  cagr: number;
  /** Raw monthly period returns Rᵢ */
  periodReturns: number[];
  /** Reconstructed monthly balance snapshots (ascending) */
  monthlySnapshots: { month: string; balance: number }[];
  /** False when there are fewer than 2 data points — caller should fall back to default rate */
  hasEnoughData: boolean;
}

/**
 * Computes the savings balance growth rate via the Geometric Mean of period returns.
 *
 * Algorithm:
 *  1. Filter transactions where source='SAVING', status='COMPLETED'.
 *  2. Group by calendar month (YYYY-MM).
 *  3. Reconstruct monthly balance snapshots by walking backwards from
 *     the current known balance:  B[t-1] = B[t] − netCashFlow[t]
 *  4. Compute period return for each consecutive pair:  Rᵢ = B[i] / B[i-1] − 1
 *  5. Apply Geometric Mean (handles negative returns correctly):
 *       monthlyCAGR = (∏ (1 + Rᵢ))^(1/n) − 1
 *  6. Annualise:  annualCAGR = (1 + monthlyCAGR)^12 − 1
 */
export function useSavingsGrowth(
  savings: SavingPackage[],
  transactions: Transaction[],
): SavingsGrowthResult {
  return useMemo(() => {
    const EMPTY: SavingsGrowthResult = {
      cagr: 0,
      periodReturns: [],
      monthlySnapshots: [],
      hasEnoughData: false,
    };

    // ── 1. Current total savings balance ─────────────────────────────────────
    const currentBalance = savings
      .filter((s) => s.type === 'SAVING')
      .reduce((sum, s) => sum + (s.currentAmount ?? 0), 0);

    if (currentBalance <= 0) return EMPTY;

    // ── 2. Filter & sort SAVING transactions (newest first) ──────────────────
    const savingTxs = transactions
      .filter((tx) => tx.source === 'SAVING' && tx.status === 'COMPLETED')
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    if (savingTxs.length < 2) return EMPTY;

    // ── 3. Group by month key "YYYY-MM" ──────────────────────────────────────
    const byMonth = new Map<string, { income: number; expense: number }>();

    for (const tx of savingTxs) {
      const d = new Date(tx.occurredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth.has(key)) byMonth.set(key, { income: 0, expense: 0 });

      const entry = byMonth.get(key)!;
      const amount = Math.abs(Number(tx.amount) || 0);

      if (tx.transactionType === 'INCOME') {
        entry.income += amount;
      } else {
        entry.expense += amount;
      }
    }

    if (byMonth.size < 2) return EMPTY;

    // ── 4. Reconstruct balance timeline (backwards from now) ─────────────────
    const nowKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    // All month keys that appear in transactions + current month, sorted descending
    const allKeys = Array.from(
      new Set([nowKey, ...Array.from(byMonth.keys())]),
    ).sort().reverse();

    const balanceMap = new Map<string, number>();
    let runningBalance = currentBalance;

    for (const key of allKeys) {
      balanceMap.set(key, runningBalance);

      const flows = byMonth.get(key);
      if (flows) {
        // Walking backwards: balance before this month's net flow
        const net = flows.income - flows.expense;
        runningBalance = Math.max(0, runningBalance - net);
      }
    }

    // ── 5. Build sorted ascending snapshots ───────────────────────────────────
    const snapshots = Array.from(balanceMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, balance]) => ({ month, balance }));

    if (snapshots.length < 2) return EMPTY;

    // ── 6. Compute period returns Rᵢ (skip periods with zero prior balance) ──
    const returns: number[] = [];

    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1].balance;
      const curr = snapshots[i].balance;
      if (prev > 0) {
        returns.push(curr / prev - 1);
      }
    }

    if (returns.length === 0) return EMPTY;

    // ── 7. Geometric Mean: product = ∏ (1 + Rᵢ) ─────────────────────────────
    //   Uses (1 + Rᵢ) before multiplying so negative returns are handled correctly.
    const product = returns.reduce((prod, r) => prod * (1 + r), 1);

    // Guard: product must be positive to take root meaningfully
    if (product <= 0) {
      return {
        cagr: 0,
        periodReturns: returns,
        monthlySnapshots: snapshots,
        hasEnoughData: true,
      };
    }

    const n = returns.length;
    const monthlyRate = Math.pow(product, 1 / n) - 1;

    // Annualise to CAGR: (1 + monthlyRate)^12 − 1
    const cagr = (Math.pow(1 + monthlyRate, 12) - 1) * 100;

    return {
      cagr,
      periodReturns: returns,
      monthlySnapshots: snapshots,
      hasEnoughData: true,
    };
  }, [savings, transactions]);
}
