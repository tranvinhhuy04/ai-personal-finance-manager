import type { AnalyticsDashboardResponse, TimeRange, Wallet } from '../types/finance';

export const DEMO_WALLETS: Wallet[] = [
  {
    id: 'wallet-techcombank',
    userId: 'demo-user',
    walletType: 'CARD',
    walletName: 'Techcombank',
    balance: '150000000',
    status: 1,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wallet-momo',
    userId: 'demo-user',
    walletType: 'MOMO',
    walletName: 'Ví MoMo',
    balance: '5500000',
    status: 1,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wallet-cash',
    userId: 'demo-user',
    walletType: 'CASH',
    walletName: 'Tiền mặt',
    balance: '15000000',
    status: 2,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const AI_SUGGESTED_QUESTIONS = [
  'Tổng chi tiêu tháng này là bao nhiêu?',
  'Cho tôi 3 cách tiết kiệm 20% thu nhập.',
  'Danh mục nào đang chi nhiều nhất?',
  'Phân tích nhanh sức khỏe tài chính hiện tại của tôi.',
];

export function getDemoAnalytics(range: TimeRange = 'month'): AnalyticsDashboardResponse {
  const labelsByRange: Record<TimeRange, string[]> = {
    month: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    quarter: ['Q1-W1', 'Q1-W2', 'Q1-W3', 'Q1-W4', 'Q1-W5', 'Q1-W6'],
    year: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6'],
  };

  const labels = labelsByRange[range];

  return {
    currentMonth: '2026-04',
    period: {
      range,
      label: range === 'month' ? 'Tháng này' : range === 'quarter' ? 'Quý này' : 'Năm nay',
      startDate: '2026-01-01',
      endDate: '2026-04-07',
    },
    summary: {
      totalIncome: 32500000,
      totalExpense: 18450000,
      net: 14050000,
      netCashFlow: 14050000,
    },
    kpis: {
      savingsRate: 43,
      dailyAverageExpense: 615000,
      recurringSpend: 2450000,
      transactionCount: 96,
    },
    insights: {
      severity: 'good',
      headline: 'Bạn đang giữ dòng tiền dương khá tốt.',
      message: 'Thu nhập đang cao hơn chi tiêu và nhóm mua sắm là khoản cần theo dõi thêm.',
      recommendation: 'Giữ quỹ dự phòng ở ví ngân hàng và giới hạn mua sắm theo tuần.',
      spendingChangePercent: 8.5,
      incomeChangePercent: 4.2,
      savingsRate: 43,
      dailyAverageExpense: 615000,
      riskiestCategory: 'Mua sắm',
    },
    trend: labels.map((label, index) => ({
      monthKey: `${index + 1}`,
      month: label,
      income: [4.2, 5.1, 4.8, 5.4, 6.0, 7.0][index] * 1_000_000,
      expense: [2.6, 3.1, 2.9, 3.3, 3.0, 3.55][index] * 1_000_000,
      net: [1.6, 2.0, 1.9, 2.1, 3.0, 3.45][index] * 1_000_000,
    })),
    comparison: labels.map((label, index) => ({
      label,
      income: [4.2, 5.1, 4.8, 5.4, 6.0, 7.0][index] * 1_000_000,
      expense: [2.6, 3.1, 2.9, 3.3, 3.0, 3.55][index] * 1_000_000,
    })),
    breakdown: [
      { categoryId: 'food', name: 'Ăn uống', value: 5200000, color: '#10b981', transactionCount: 18 },
      { categoryId: 'shopping', name: 'Mua sắm', value: 4700000, color: '#f43f5e', transactionCount: 12 },
      { categoryId: 'transport', name: 'Di chuyển', value: 2650000, color: '#06b6d4', transactionCount: 10 },
      { categoryId: 'bills', name: 'Hóa đơn', value: 2100000, color: '#8b5cf6', transactionCount: 6 },
    ],
    budgetProgress: [
      { category: 'Mua sắm', spent: 4700000, limit: 5000000, remaining: 300000, percent: 94 },
      { category: 'Ăn uống', spent: 5200000, limit: 6500000, remaining: 1300000, percent: 80 },
      { category: 'Di chuyển', spent: 2650000, limit: 3500000, remaining: 850000, percent: 76 },
    ],
    forecast: [
      { label: 'Tháng sau', actual: 14050000, forecast: 15200000 },
      { label: '2 tháng nữa', forecast: 16000000 },
      { label: '3 tháng nữa', forecast: 16800000 },
    ],
    topTransactions: [
      { id: 'txn1', merchant: 'Winmart', category: 'Ăn uống', date: 'Hôm nay', amount: 350000, transactionType: 'EXPENSE' },
      { id: 'txn2', merchant: 'Lương công ty', category: 'Thu nhập', date: '02/04', amount: 18000000, transactionType: 'INCOME' },
      { id: 'txn3', merchant: 'Shopee', category: 'Mua sắm', date: '30/03', amount: 850000, transactionType: 'EXPENSE' },
    ],
  };
}
