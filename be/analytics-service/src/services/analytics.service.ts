import { AppError } from '../errors/AppError';
import { MonthlyAggregateModel } from '../models/monthlyAggregate.model';

function toMonthKey(date?: string) {
  const occurredDate = date ? new Date(date) : new Date();
  const year = occurredDate.getUTCFullYear();
  const month = String(occurredDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getRecentMonthKeys(count: number) {
  const now = new Date();
  const keys: string[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const point = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const year = point.getUTCFullYear();
    const month = String(point.getUTCMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
  }

  return keys;
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

  async getDashboard(userId: string) {
    if (!userId) {
      throw new AppError('user_id is required', 400);
    }

    const monthKeys = getRecentMonthKeys(6);
    const docs = await MonthlyAggregateModel.find({
      user_id: userId,
      month: { $in: monthKeys },
    }).lean();

    const mapByMonth = new Map(docs.map((item) => [item.month, item]));

    const trend = monthKeys.map((month) => {
      const item = mapByMonth.get(month);
      return {
        month,
        totalIncome: item?.totalIncome ?? 0,
        totalExpense: item?.totalExpense ?? 0,
        netCashFlow: item?.netCashFlow ?? 0,
      };
    });

    const currentMonth = monthKeys[monthKeys.length - 1];
    const current = mapByMonth.get(currentMonth);

    return {
      currentMonth,
      summary: {
        totalIncome: current?.totalIncome ?? 0,
        totalExpense: current?.totalExpense ?? 0,
        netCashFlow: current?.netCashFlow ?? 0,
        byCategory: current?.byCategory ?? [],
        byWallet: current?.byWallet ?? [],
      },
      trend,
    };
  }
}

export const analyticsService = new AnalyticsService();
