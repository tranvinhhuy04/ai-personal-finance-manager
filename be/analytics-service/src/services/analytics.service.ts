import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { MonthlyAggregateModel } from '../models/monthlyAggregate.model';

type AnalyticsRange = 'month' | 'quarter' | 'year' | 'custom';

type DashboardFilters = {
  userId: string;
  month?: string;
  walletId?: string;
  range?: string;
  type?: string;
  from?: string;
  to?: string;
};

type MonthWindow = {
  monthKey: string;
  startDate: Date;
  endDate: Date;
};

type PeriodWindow = MonthWindow & {
  range: AnalyticsRange;
  label: string;
};

type SummaryResult = {
  totalIncome: number;
  totalExpense: number;
  net: number;
};

type BreakdownItem = {
  categoryId: string;
  name: string;
  value: number;
  color: string;
  transactionCount: number;
};

type DetailedTransaction = {
  id: string;
  walletId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  transactionType: 'INCOME' | 'EXPENSE';
  amount: number;
  occurredAt: Date;
  source: string;
};
type SavingsMetrics = {
  savedAmount: number;
  savingsRate: number;
};

function toMonthKey(date?: string | Date) {
  const occurredDate = date ? new Date(date) : new Date();
  const year = occurredDate.getUTCFullYear();
  const month = String(occurredDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function normalizeMonthKey(input?: string): string | null {
  if (!input) return null;
  const raw = input.trim();

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}\/\d{4}$/.test(raw)) {
    const [month, year] = raw.split('/');
    return `${year}-${month}`;
  }

  return null;
}

function parseMonthKey(monthKey?: string) {
  let normalized: string;
  if (monthKey !== undefined && monthKey !== null && String(monthKey).trim().length > 0) {
    const parsed = normalizeMonthKey(monthKey);
    if (!parsed) {
      throw new AppError('month must be in YYYY-MM or MM/YYYY format', 400);
    }
    normalized = parsed;
  } else {
    normalized = toMonthKey();
  }

  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new AppError('month must be in YYYY-MM or MM/YYYY format', 400);
  }

  return { normalized, year, monthIndex };
}

function getMonthWindow(monthKey?: string): MonthWindow {
  const { normalized, year, monthIndex } = parseMonthKey(monthKey);
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return {
    monthKey: normalized,
    startDate,
    endDate,
  };
}

function getRecentMonthKeys(count: number, endMonthKey?: string) {
  const { year, monthIndex } = parseMonthKey(endMonthKey);
  const keys: string[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const point = new Date(Date.UTC(year, monthIndex - index, 1));
    const pointYear = point.getUTCFullYear();
    const pointMonth = String(point.getUTCMonth() + 1).padStart(2, '0');
    keys.push(`${pointYear}-${pointMonth}`);
  }

  return keys;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `${month}/${year}`;
}

function roundMoney(value: unknown): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

function roundPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function roundToStep(value: number, step = 50000): number {
  const safeValue = Math.max(step, Number.isFinite(value) ? value : step);
  return Math.ceil(safeValue / step) * step;
}

function safeDate(value: unknown): Date {
  const candidate = value ? new Date(value as string | number | Date) : new Date();
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 24 * 60 * 60 * 1000);
}

function diffDaysInclusive(startDate: Date, endDate: Date) {
  const ms = Math.max(0, endDate.getTime() - startDate.getTime());
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function formatDayMonth(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatShortLabel(date: Date, range: AnalyticsRange) {
  if (range === 'year' || range === 'quarter') {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${month}/${date.getUTCFullYear()}`;
  }

  return formatDayMonth(date);
}

function calculatePercentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function getCategoryColor(name: string) {
  const palette: Record<string, string> = {
    'Ăn uống': '#f97316',
    'Mua sắm': '#8b5cf6',
    'Hóa đơn': '#ef4444',
    'Di chuyển': '#0ea5e9',
    'Lương': '#10b981',
    'Thưởng': '#22c55e',
    'Giải trí': '#14b8a6',
    'Nhà ở': '#f43f5e',
  };

  return palette[name] ?? '#14b8a6';
}

function resolveTransactionDbName() {
  const configuredUri = process.env.MONGO_URI_TRANSACTION;
  if (configuredUri) {
    const url = new URL(configuredUri);
    const dbName = url.pathname.replace(/^\//, '').trim();
    if (dbName) return dbName;
  }

  return process.env.TRANSACTION_DB_NAME ?? 'fintech_transaction-service';
}

function getTransactionDb() {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('Analytics database is not connected', 500);
  }

  return mongoose.connection.useDb(resolveTransactionDbName(), { useCache: true });
}

function buildTransactionPipeline(filters: {
  userId: string;
  walletId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const pipeline: any[] = [
    {
      $match: {
        $and: [
          {
            $or: [{ user_id: filters.userId }, { userId: filters.userId }],
          },
          {
            $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }],
          },
        ],
      },
    },
    {
      $addFields: {
        normalizedAmount: {
          $toDouble: {
            $ifNull: ['$amount', 0],
          },
        },
        normalizedType: {
          $ifNull: ['$transaction_type', '$transactionType'],
        },
        normalizedOccurredAt: {
          $ifNull: ['$occurred_at', '$occurredAt'],
        },
        normalizedWalletId: {
          $ifNull: ['$wallet_id', '$walletId'],
        },
        normalizedCategoryId: {
          $ifNull: ['$category_id', '$categoryId'],
        },
      },
    },
  ];

  const matchAfterNormalization: Record<string, unknown> = {};

  if (filters.walletId) {
    matchAfterNormalization.normalizedWalletId = filters.walletId;
  }

  if (filters.startDate || filters.endDate) {
    matchAfterNormalization.normalizedOccurredAt = {
      ...(filters.startDate ? { $gte: filters.startDate } : {}),
      ...(filters.endDate ? { $lte: filters.endDate } : {}),
    };
  }

  if (Object.keys(matchAfterNormalization).length > 0) {
    pipeline.push({ $match: matchAfterNormalization });
  }

  return pipeline;
}

function normalizeRange(range?: string, legacyType?: string): AnalyticsRange {
  const raw = String(range ?? legacyType ?? '').toLowerCase();

  if (raw === 'quarter') return 'quarter';
  if (raw === 'year' || raw === 'yearly') return 'year';
  if (raw === 'custom') return 'custom';
  return 'month';
}

function getPeriodWindow(filters: DashboardFilters): PeriodWindow {
  const range = normalizeRange(filters.range, filters.type);

  if (range === 'custom' && (!filters.from || !filters.to)) {
    throw new AppError('from and to are required when range=custom', 400);
  }

  if (range === 'custom' && filters.from && filters.to) {
    const startDate = safeDate(filters.from);
    const endDate = safeDate(filters.to);

    if (startDate.getTime() > endDate.getTime()) {
      throw new AppError('from must be before or equal to to', 400);
    }

    return {
      range,
      monthKey: toMonthKey(startDate),
      startDate: new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999)),
      label: `${formatDayMonth(startDate)} - ${formatDayMonth(endDate)}`,
    };
  }

  const { normalized, year, monthIndex } = parseMonthKey(filters.month);

  if (range === 'quarter') {
    const quarterStartMonth = Math.floor(monthIndex / 3) * 3;
    const quarter = Math.floor(monthIndex / 3) + 1;
    return {
      range,
      monthKey: normalized,
      startDate: new Date(Date.UTC(year, quarterStartMonth, 1, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(year, quarterStartMonth + 3, 0, 23, 59, 59, 999)),
      label: `Quý ${quarter}/${year}`,
    };
  }

  if (range === 'year') {
    return {
      range,
      monthKey: normalized,
      startDate: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
      label: `Năm ${year}`,
    };
  }

  const monthWindow = getMonthWindow(normalized);
  return {
    range,
    ...monthWindow,
    label: `Tháng ${formatMonthLabel(monthWindow.monthKey)}`,
  };
}

function getPreviousPeriodWindow(currentWindow: PeriodWindow) {
  const durationMs = currentWindow.endDate.getTime() - currentWindow.startDate.getTime();
  const previousEnd = new Date(currentWindow.startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    startDate: previousStart,
    endDate: previousEnd,
  };
}

function buildComparisonData(transactions: DetailedTransaction[], window: PeriodWindow) {
  if (window.range === 'year' || window.range === 'quarter') {
    const monthKeys: string[] = [];
    const current = new Date(Date.UTC(window.startDate.getUTCFullYear(), window.startDate.getUTCMonth(), 1));

    while (current.getTime() <= window.endDate.getTime()) {
      monthKeys.push(`${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`);
      current.setUTCMonth(current.getUTCMonth() + 1);
    }

    const monthMap = new Map(
      monthKeys.map((monthKey) => [monthKey, { label: formatMonthLabel(monthKey), income: 0, expense: 0 }])
    );

    transactions.forEach((transaction) => {
      const monthKey = toMonthKey(transaction.occurredAt);
      const currentBucket = monthMap.get(monthKey);
      if (!currentBucket) return;

      if (transaction.transactionType === 'INCOME') {
        currentBucket.income += transaction.amount;
      } else {
        currentBucket.expense += transaction.amount;
      }
    });

    return Array.from(monthMap.values()).map((item) => ({
      ...item,
      income: roundMoney(item.income),
      expense: roundMoney(item.expense),
    }));
  }

  const totalDays = diffDaysInclusive(window.startDate, window.endDate);
  const weekCount = Math.max(1, Math.ceil(totalDays / 7));
  const weekBuckets = Array.from({ length: weekCount }, (_, index) => ({
    label: `Tuần ${index + 1}`,
    income: 0,
    expense: 0,
  }));

  transactions.forEach((transaction) => {
    const dayOffset = Math.max(0, diffDaysInclusive(window.startDate, transaction.occurredAt) - 1);
    const weekIndex = Math.min(weekBuckets.length - 1, Math.floor(dayOffset / 7));
    const bucket = weekBuckets[weekIndex];

    if (transaction.transactionType === 'INCOME') {
      bucket.income += transaction.amount;
    } else {
      bucket.expense += transaction.amount;
    }
  });

  return weekBuckets.map((item) => ({
    ...item,
    income: roundMoney(item.income),
    expense: roundMoney(item.expense),
  }));
}

function getCumulativeAt(points: Array<{ time: number; value: number }>, targetTime: number) {
  let latestValue = 0;

  for (const point of points) {
    if (point.time <= targetTime) {
      latestValue = point.value;
      continue;
    }

    break;
  }

  return roundMoney(latestValue);
}

function buildForecastData(transactions: DetailedTransaction[], window: PeriodWindow) {
  const sortedTransactions = [...transactions].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const cumulativePoints: Array<{ time: number; value: number }> = [];

  let runningNet = 0;
  sortedTransactions.forEach((transaction) => {
    runningNet += transaction.transactionType === 'INCOME' ? transaction.amount : -transaction.amount;
    cumulativePoints.push({
      time: transaction.occurredAt.getTime(),
      value: runningNet,
    });
  });

  const actualCutoff = sortedTransactions.length > 0
    ? sortedTransactions[sortedTransactions.length - 1].occurredAt
    : new Date(Math.min(Date.now(), window.endDate.getTime()));
  const actualEndTime = Math.min(actualCutoff.getTime(), window.endDate.getTime());
  const elapsedDays = Math.max(1, diffDaysInclusive(window.startDate, new Date(actualEndTime)));
  const averageDailyNet = runningNet / elapsedDays;
  const sampleCount = window.range === 'year' ? 8 : window.range === 'quarter' ? 6 : 7;
  const timeSpan = Math.max(1, window.endDate.getTime() - window.startDate.getTime());

  return Array.from({ length: sampleCount }, (_, index) => {
    const ratio = index / Math.max(sampleCount - 1, 1);
    const pointTime = window.startDate.getTime() + Math.round(timeSpan * ratio);
    const pointDate = new Date(pointTime);
    const actualValue = getCumulativeAt(cumulativePoints, Math.min(pointTime, actualEndTime));

    if (pointTime <= actualEndTime) {
      return {
        label: formatShortLabel(pointDate, window.range),
        actual: actualValue,
        forecast: pointTime === actualEndTime ? actualValue : undefined,
      };
    }

    const daysAhead = diffDaysInclusive(new Date(actualEndTime), pointDate) - 1;
    return {
      label: formatShortLabel(pointDate, window.range),
      forecast: roundMoney(actualValue + averageDailyNet * Math.max(0, daysAhead)),
    };
  });
}

function buildTopTransactions(transactions: DetailedTransaction[]) {
  return [...transactions]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 6)
    .map((transaction) => ({
      id: transaction.id,
      merchant:
        transaction.description.trim() ||
        (transaction.transactionType === 'INCOME' ? 'Khoản thu nhập' : 'Khoản chi tiêu'),
      category: transaction.categoryName || 'Khác',
      date: formatDayMonth(transaction.occurredAt),
      amount: transaction.transactionType === 'INCOME' ? transaction.amount : -transaction.amount,
      transactionType: transaction.transactionType,
      source: transaction.source,
    }));
}

function getWeekdayLabel(dayOfWeek: number | null) {
  const labels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) {
    return 'Hàng tuần';
  }

  return `${labels[dayOfWeek]} hàng tuần`;
}

function buildBudgetProgress(currentBreakdown: BreakdownItem[], previousBreakdown: BreakdownItem[]) {
  const previousMap = new Map(previousBreakdown.map((item) => [item.categoryId || item.name, item]));

  return currentBreakdown.slice(0, 5).map((item) => {
    const previousValue = previousMap.get(item.categoryId || item.name)?.value ?? 0;
    const suggestedLimit = roundToStep(Math.max(item.value * 1.15, previousValue * 1.08, 500000));
    const remaining = Math.max(0, suggestedLimit - item.value);
    const percent = suggestedLimit > 0 ? Math.min(100, Math.round((item.value / suggestedLimit) * 100)) : 0;

    return {
      category: item.name,
      spent: item.value,
      limit: suggestedLimit,
      remaining,
      percent,
    };
  });
}
function buildSavingsMetrics(summary: SummaryResult, transactions: DetailedTransaction[]): SavingsMetrics {
  const savingsDeposits = transactions.reduce((sum, transaction) => {
    if (transaction.source !== 'SAVING' || transaction.transactionType !== 'EXPENSE') {
      return sum;
    }

    return sum + transaction.amount;
  }, 0);

  const savingsWithdrawals = transactions.reduce((sum, transaction) => {
    if (transaction.source !== 'SAVING' || transaction.transactionType !== 'INCOME') {
      return sum;
    }

    return sum + transaction.amount;
  }, 0);

  const retainedCash = Math.max(0, summary.totalIncome - savingsWithdrawals - summary.totalExpense);
  const netSavingsContribution = Math.max(0, savingsDeposits - savingsWithdrawals);
  const savedAmount = roundMoney(retainedCash + netSavingsContribution);
  const savingsRate = summary.totalIncome > 0
    ? roundPercent((savedAmount / summary.totalIncome) * 100)
    : 0;

  return {
    savedAmount,
    savingsRate,
  };
}

function buildInsights(input: {
  summary: SummaryResult;
  previousSummary: SummaryResult;
  budgetProgress: Array<{ category: string; percent: number }>;
  recurringSpend: number;
  transactionCount: number;
  periodDays: number;
  savingsMetrics: SavingsMetrics;
}) {
  const spendingChangePercent = roundPercent(
    calculatePercentChange(input.summary.totalExpense, input.previousSummary.totalExpense)
  );
  const incomeChangePercent = roundPercent(
    calculatePercentChange(input.summary.totalIncome, input.previousSummary.totalIncome)
  );
  const savingsRate = input.savingsMetrics.savingsRate;

  const dailyAverageExpense = roundMoney(input.summary.totalExpense / Math.max(1, input.periodDays));
  const riskiestCategory = [...input.budgetProgress].sort((a, b) => b.percent - a.percent)[0]?.category ?? null;

  let severity: 'good' | 'warning' | 'neutral' = 'neutral';
  let headline = 'Dòng tiền hiện tại đang được kiểm soát khá ổn định.';

  if (spendingChangePercent > 10) {
    severity = 'warning';
    headline = `Chi tiêu đang tăng ${spendingChangePercent}% so với kỳ trước.`;
  } else if (savingsRate >= 20) {
    severity = 'good';
    headline = `Tỷ lệ tiết kiệm đạt ${savingsRate}% — một mức rất tích cực.`;
  }

  const message = riskiestCategory
    ? `Danh mục ${riskiestCategory} đang là điểm cần theo dõi nhất trong kỳ này, đặc biệt khi bạn đã có ${input.transactionCount} giao dịch phát sinh.`
    : `Trong kỳ này hệ thống ghi nhận ${input.transactionCount} giao dịch và dòng tiền đang bám sát xu hướng trung bình.`;

  const recommendation = input.recurringSpend > 0
    ? `Các khoản chi định kỳ hiện vào khoảng ${roundMoney(input.recurringSpend).toLocaleString('vi-VN')}₫. Bạn có thể rà soát lại để tối ưu quỹ dự phòng.`
    : 'Bạn có thể duy trì nhịp chi hiện tại và ưu tiên tăng quỹ dự phòng từ phần tiền dương còn lại.';

  return {
    severity,
    headline,
    message,
    recommendation,
    spendingChangePercent,
    incomeChangePercent,
    savingsRate,
    dailyAverageExpense,
    riskiestCategory,
  };
}

class AnalyticsService {
  async applyTransactionEvent(input: {
    userId: string;
    walletId: string;
    walletName?: string;
    categoryId: string;
    categoryName?: string;
    transactionType: 'INCOME' | 'EXPENSE';
    amount: number;
    occurredAt?: string;
  }) {
    if (!input.userId) {
      throw new AppError('userId is required', 400);
    }

    const monthKey = toMonthKey(input.occurredAt);
    const signedNet = input.transactionType === 'INCOME' ? input.amount : -input.amount;

    await MonthlyAggregateModel.updateOne(
      { user_id: input.userId, month: monthKey },
      {
        $setOnInsert: {
          user_id: input.userId,
          month: monthKey,
          totalIncome: 0,
          totalExpense: 0,
          netCashFlow: 0,
          byCategory: [],
          byWallet: [],
          generatedAt: new Date(),
          sourceVersion: 0,
        },
      },
      { upsert: true }
    );

    await MonthlyAggregateModel.updateOne(
      { user_id: input.userId, month: monthKey },
      {
        $inc: {
          totalIncome: input.transactionType === 'INCOME' ? input.amount : 0,
          totalExpense: input.transactionType === 'EXPENSE' ? input.amount : 0,
          netCashFlow: signedNet,
          sourceVersion: 1,
        },
        $set: { generatedAt: new Date() },
      }
    );

    const updateCategory = await MonthlyAggregateModel.updateOne(
      {
        user_id: input.userId,
        month: monthKey,
        'byCategory.category_id': input.categoryId,
      },
      {
        $inc: {
          'byCategory.$.total_amount': input.amount,
          'byCategory.$.transaction_count': 1,
        },
      }
    );

    if (updateCategory.modifiedCount === 0) {
      await MonthlyAggregateModel.updateOne(
        { user_id: input.userId, month: monthKey },
        {
          $push: {
            byCategory: {
              category_id: input.categoryId,
              category_name: input.categoryName ?? 'Unknown',
              total_amount: input.amount,
              transaction_count: 1,
            },
          },
        }
      );
    }

    const updateWallet = await MonthlyAggregateModel.updateOne(
      {
        user_id: input.userId,
        month: monthKey,
        'byWallet.wallet_id': input.walletId,
      },
      {
        $inc: {
          'byWallet.$.total_amount': input.amount,
          'byWallet.$.transaction_count': 1,
        },
      }
    );

    if (updateWallet.modifiedCount === 0) {
      await MonthlyAggregateModel.updateOne(
        { user_id: input.userId, month: monthKey },
        {
          $push: {
            byWallet: {
              wallet_id: input.walletId,
              wallet_name: input.walletName ?? 'Wallet',
              total_amount: input.amount,
              transaction_count: 1,
            },
          },
        }
      );
    }
  }

  private async aggregateSummary(
    transactions: ReturnType<ReturnType<typeof getTransactionDb>['collection']>,
    filters: { userId: string; walletId?: string; startDate: Date; endDate: Date }
  ): Promise<SummaryResult> {
    const summaryRows = await transactions
      .aggregate([
        ...buildTransactionPipeline(filters),
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: {
                $cond: [{ $eq: ['$normalizedType', 'INCOME'] }, '$normalizedAmount', 0],
              },
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ['$normalizedType', 'EXPENSE'] }, '$normalizedAmount', 0],
              },
            },
          },
        },
      ])
      .toArray();

    const summaryRow = summaryRows[0] ?? { totalIncome: 0, totalExpense: 0 };
    const totalIncome = roundMoney(summaryRow.totalIncome);
    const totalExpense = roundMoney(summaryRow.totalExpense);

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
    };
  }

  private async aggregateTrend(
    transactions: ReturnType<ReturnType<typeof getTransactionDb>['collection']>,
    filters: { userId: string; walletId?: string },
    startDate: Date,
    endDate: Date,
    trendMonthKeys: string[]
  ) {
    const trendRows = await transactions
      .aggregate([
        ...buildTransactionPipeline({
          userId: filters.userId,
          walletId: filters.walletId,
          startDate,
          endDate,
        }),
        {
          $group: {
            _id: {
              year: { $year: '$normalizedOccurredAt' },
              month: { $month: '$normalizedOccurredAt' },
            },
            income: {
              $sum: {
                $cond: [{ $eq: ['$normalizedType', 'INCOME'] }, '$normalizedAmount', 0],
              },
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ['$normalizedType', 'EXPENSE'] }, '$normalizedAmount', 0],
              },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
      .toArray();

    const trendMap = new Map(
      trendRows.map((row) => {
        const monthKey = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
        return [monthKey, row];
      })
    );

    return trendMonthKeys.map((monthKey) => {
      const row = trendMap.get(monthKey);
      const income = roundMoney(row?.income);
      const expense = roundMoney(row?.expense);
      const netValue = income - expense;

      return {
        monthKey,
        month: formatMonthLabel(monthKey),
        income,
        expense,
        net: netValue,
        totalIncome: income,
        totalExpense: expense,
        netCashFlow: netValue,
      };
    });
  }

  private async aggregateBreakdown(
    transactions: ReturnType<ReturnType<typeof getTransactionDb>['collection']>,
    filters: { userId: string; walletId?: string; startDate: Date; endDate: Date }
  ): Promise<BreakdownItem[]> {
    const breakdownRows = await transactions
      .aggregate([
        ...buildTransactionPipeline(filters),
        {
          $match: {
            normalizedType: 'EXPENSE',
          },
        },
        {
          $addFields: {
            categoryObjectId: {
              $convert: {
                input: '$normalizedCategoryId',
                to: 'objectId',
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryObjectId',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        {
          $unwind: {
            path: '$categoryInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: '$normalizedCategoryId',
            value: { $sum: '$normalizedAmount' },
            name: {
              $first: {
                $ifNull: ['$categoryInfo.name', 'Khác'],
              },
            },
            color: {
              $first: '$categoryInfo.color',
            },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
      ])
      .toArray();

    return breakdownRows.map((row) => ({
      categoryId: String(row._id ?? ''),
      name: String(row.name ?? 'Khác'),
      value: roundMoney(row.value),
      color: row.color ? String(row.color) : getCategoryColor(String(row.name ?? 'Khác')),
      transactionCount: Number(row.transactionCount ?? 0),
    }));
  }

  private async loadDetailedTransactions(
    transactions: ReturnType<ReturnType<typeof getTransactionDb>['collection']>,
    filters: { userId: string; walletId?: string; startDate: Date; endDate: Date }
  ): Promise<DetailedTransaction[]> {
    const rows = await transactions
      .aggregate([
        ...buildTransactionPipeline(filters),
        {
          $addFields: {
            categoryObjectId: {
              $convert: {
                input: '$normalizedCategoryId',
                to: 'objectId',
                onError: null,
                onNull: null,
              },
            },
            normalizedDescription: {
              $ifNull: ['$description', ''],
            },
            normalizedSource: {
              $ifNull: ['$source', 'MANUAL'],
            },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryObjectId',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        {
          $unwind: {
            path: '$categoryInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { normalizedOccurredAt: 1 } },
        {
          $project: {
            _id: 1,
            normalizedAmount: 1,
            normalizedType: 1,
            normalizedOccurredAt: 1,
            normalizedWalletId: 1,
            normalizedCategoryId: 1,
            normalizedDescription: 1,
            normalizedSource: 1,
            categoryName: { $ifNull: ['$categoryInfo.name', 'Khác'] },
          },
        },
      ])
      .toArray();

    return rows.map((row) => ({
      id: String(row._id ?? ''),
      walletId: String(row.normalizedWalletId ?? ''),
      categoryId: String(row.normalizedCategoryId ?? ''),
      categoryName: String(row.categoryName ?? 'Khác'),
      description: String(row.normalizedDescription ?? ''),
      transactionType: row.normalizedType === 'INCOME' ? 'INCOME' : 'EXPENSE',
      amount: roundMoney(row.normalizedAmount),
      occurredAt: safeDate(row.normalizedOccurredAt),
      source: String(row.normalizedSource ?? 'MANUAL'),
    }));
  }

  private async loadSubscriptions(
    transactionDb: ReturnType<typeof getTransactionDb>,
    filters: { userId: string; walletId?: string }
  ) {
    const recurringRules = transactionDb.collection('recurring_rules');

    const rows = await recurringRules
      .aggregate([
        {
          $match: {
            user_id: filters.userId,
            transaction_type: 'EXPENSE',
            ...(filters.walletId ? { wallet_id: filters.walletId } : {}),
          },
        },
        {
          $addFields: {
            normalizedAmount: {
              $toDouble: { $ifNull: ['$amount', 0] },
            },
            categoryObjectId: {
              $convert: {
                input: '$category_id',
                to: 'objectId',
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryObjectId',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        {
          $unwind: {
            path: '$categoryInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { normalizedAmount: -1, createdAt: -1 } },
        { $limit: 6 },
      ])
      .toArray();

    return rows.map((row) => ({
      id: String(row._id ?? ''),
      name: String(row.note ?? row.categoryInfo?.name ?? 'Khoản định kỳ'),
      date:
        row.frequency === 'MONTHLY'
          ? `Ngày ${String(row.day_of_month ?? 1).padStart(2, '0')}`
          : getWeekdayLabel(typeof row.day_of_week === 'number' ? row.day_of_week : null),
      amount: roundMoney(row.normalizedAmount),
      frequency: row.frequency === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY',
      status: row.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    }));
  }

  async getDashboard(filters: DashboardFilters) {
    if (!filters.userId) {
      throw new AppError('userId is required', 400);
    }

    const transactionDb = getTransactionDb();
    const transactions = transactionDb.collection('transactions');

    const currentWindow = getPeriodWindow(filters);
    const previousWindow = getPreviousPeriodWindow(currentWindow);
    const trendMonthCount = currentWindow.range === 'year' || filters.type === 'yearly' ? 12 : 6;
    const trendMonthKeys = getRecentMonthKeys(trendMonthCount, currentWindow.monthKey);
    const trendWindow = getMonthWindow(trendMonthKeys[0]);

    const [summary, previousSummary, breakdown, previousBreakdown, detailedTransactions, subscriptions, trend] = await Promise.all([
      this.aggregateSummary(transactions, {
        userId: filters.userId,
        walletId: filters.walletId,
        startDate: currentWindow.startDate,
        endDate: currentWindow.endDate,
      }),
      this.aggregateSummary(transactions, {
        userId: filters.userId,
        walletId: filters.walletId,
        startDate: previousWindow.startDate,
        endDate: previousWindow.endDate,
      }),
      this.aggregateBreakdown(transactions, {
        userId: filters.userId,
        walletId: filters.walletId,
        startDate: currentWindow.startDate,
        endDate: currentWindow.endDate,
      }),
      this.aggregateBreakdown(transactions, {
        userId: filters.userId,
        walletId: filters.walletId,
        startDate: previousWindow.startDate,
        endDate: previousWindow.endDate,
      }),
      this.loadDetailedTransactions(transactions, {
        userId: filters.userId,
        walletId: filters.walletId,
        startDate: currentWindow.startDate,
        endDate: currentWindow.endDate,
      }),
      this.loadSubscriptions(transactionDb, {
        userId: filters.userId,
        walletId: filters.walletId,
      }),
      this.aggregateTrend(
        transactions,
        { userId: filters.userId, walletId: filters.walletId },
        trendWindow.startDate,
        currentWindow.endDate,
        trendMonthKeys
      ),
    ]);

    const comparison = buildComparisonData(detailedTransactions, currentWindow);
    const budgetProgress = buildBudgetProgress(breakdown, previousBreakdown);
    const topTransactions = buildTopTransactions(detailedTransactions);
    const forecast = buildForecastData(detailedTransactions, currentWindow);
    const recurringSpend = subscriptions
      .filter((item) => item.status === 'ACTIVE')
      .reduce((sum, item) => sum + item.amount, 0);
    const periodDays = diffDaysInclusive(currentWindow.startDate, currentWindow.endDate);
    const savingsMetrics = buildSavingsMetrics(summary, detailedTransactions);
    const insights = buildInsights({
      summary,
      previousSummary,
      budgetProgress,
      recurringSpend,
      transactionCount: detailedTransactions.length,
      periodDays,
      savingsMetrics,
    });

    return {
      currentMonth: currentWindow.monthKey,
      filters: {
        month: currentWindow.monthKey,
        walletId: filters.walletId ?? null,
        range: currentWindow.range,
        from: filters.from ?? null,
        to: filters.to ?? null,
      },
      period: {
        range: currentWindow.range,
        label: currentWindow.label,
        startDate: currentWindow.startDate.toISOString(),
        endDate: currentWindow.endDate.toISOString(),
      },
      summary: {
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        net: summary.net,
        netCashFlow: summary.net,
        byCategory: breakdown.map((item) => ({
          category_id: item.categoryId,
          category_name: item.name,
          total_amount: item.value,
          transaction_count: item.transactionCount,
          color: item.color,
        })),
        byWallet: [],
      },
      kpis: {
        savingsRate: insights.savingsRate,
        dailyAverageExpense: insights.dailyAverageExpense,
        recurringSpend: roundMoney(recurringSpend),
        transactionCount: detailedTransactions.length,
      },
      insights,
      trend,
      breakdown,
      comparison,
      budgetProgress,
      forecast,
      topTransactions,
      subscriptions,
    };
  }
}

export const analyticsService = new AnalyticsService();
