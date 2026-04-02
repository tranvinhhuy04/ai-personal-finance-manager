"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AppError_1 = require("../errors/AppError");
const monthlyAggregate_model_1 = require("../models/monthlyAggregate.model");
function toMonthKey(date) {
    const occurredDate = date ? new Date(date) : new Date();
    const year = occurredDate.getUTCFullYear();
    const month = String(occurredDate.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function normalizeMonthKey(input) {
    if (!input)
        return null;
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
function parseMonthKey(monthKey) {
    const normalized = normalizeMonthKey(monthKey) ?? toMonthKey();
    const [yearText, monthText] = normalized.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        throw new AppError_1.AppError('month must be in YYYY-MM or MM/YYYY format', 400);
    }
    return { normalized, year, monthIndex };
}
function getMonthWindow(monthKey) {
    const { normalized, year, monthIndex } = parseMonthKey(monthKey);
    const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    return {
        monthKey: normalized,
        startDate,
        endDate,
    };
}
function getRecentMonthKeys(count, endMonthKey) {
    const { year, monthIndex } = parseMonthKey(endMonthKey);
    const keys = [];
    for (let index = count - 1; index >= 0; index -= 1) {
        const point = new Date(Date.UTC(year, monthIndex - index, 1));
        const pointYear = point.getUTCFullYear();
        const pointMonth = String(point.getUTCMonth() + 1).padStart(2, '0');
        keys.push(`${pointYear}-${pointMonth}`);
    }
    return keys;
}
function formatMonthLabel(monthKey) {
    const [, month] = monthKey.split('-');
    const [year] = monthKey.split('-');
    return `${month}/${year}`;
}
function roundMoney(value) {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num))
        return 0;
    return Math.round(num);
}
function getCategoryColor(name) {
    const palette = {
        'Ăn uống': '#f97316',
        'Mua sắm': '#8b5cf6',
        'Hóa đơn': '#ef4444',
        'Di chuyển': '#0ea5e9',
        'Lương': '#10b981',
        'Thưởng': '#22c55e',
    };
    return palette[name] ?? '#14b8a6';
}
function resolveTransactionDbName() {
    const configuredUri = process.env.MONGO_URI_TRANSACTION;
    if (configuredUri) {
        const url = new URL(configuredUri);
        const dbName = url.pathname.replace(/^\//, '').trim();
        if (dbName)
            return dbName;
    }
    return process.env.TRANSACTION_DB_NAME ?? 'fintech_transaction-service';
}
function getTransactionDb() {
    if (mongoose_1.default.connection.readyState !== 1) {
        throw new AppError_1.AppError('Analytics database is not connected', 500);
    }
    return mongoose_1.default.connection.useDb(resolveTransactionDbName(), { useCache: true });
}
function buildTransactionPipeline(filters) {
    const pipeline = [
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
    const matchAfterNormalization = {};
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
class AnalyticsService {
    async applyTransactionEvent(input) {
        if (!input.userId) {
            throw new AppError_1.AppError('userId is required', 400);
        }
        const monthKey = toMonthKey(input.occurredAt);
        const signedNet = input.transactionType === 'INCOME' ? input.amount : -input.amount;
        await monthlyAggregate_model_1.MonthlyAggregateModel.updateOne({ user_id: input.userId, month: monthKey }, {
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
        }, { upsert: true });
        await monthlyAggregate_model_1.MonthlyAggregateModel.updateOne({ user_id: input.userId, month: monthKey }, {
            $inc: {
                totalIncome: input.transactionType === 'INCOME' ? input.amount : 0,
                totalExpense: input.transactionType === 'EXPENSE' ? input.amount : 0,
                netCashFlow: signedNet,
                sourceVersion: 1,
            },
            $set: { generatedAt: new Date() },
        });
        const updateCategory = await monthlyAggregate_model_1.MonthlyAggregateModel.updateOne({
            user_id: input.userId,
            month: monthKey,
            'byCategory.category_id': input.categoryId,
        }, {
            $inc: {
                'byCategory.$.total_amount': input.amount,
                'byCategory.$.transaction_count': 1,
            },
        });
        if (updateCategory.modifiedCount === 0) {
            await monthlyAggregate_model_1.MonthlyAggregateModel.updateOne({ user_id: input.userId, month: monthKey }, {
                $push: {
                    byCategory: {
                        category_id: input.categoryId,
                        category_name: input.categoryName ?? 'Unknown',
                        total_amount: input.amount,
                        transaction_count: 1,
                    },
                },
            });
        }
        const updateWallet = await monthlyAggregate_model_1.MonthlyAggregateModel.updateOne({
            user_id: input.userId,
            month: monthKey,
            'byWallet.wallet_id': input.walletId,
        }, {
            $inc: {
                'byWallet.$.total_amount': input.amount,
                'byWallet.$.transaction_count': 1,
            },
        });
        if (updateWallet.modifiedCount === 0) {
            await monthlyAggregate_model_1.MonthlyAggregateModel.updateOne({ user_id: input.userId, month: monthKey }, {
                $push: {
                    byWallet: {
                        wallet_id: input.walletId,
                        wallet_name: input.walletName ?? 'Wallet',
                        total_amount: input.amount,
                        transaction_count: 1,
                    },
                },
            });
        }
    }
    async getDashboard(filters) {
        if (!filters.userId) {
            throw new AppError_1.AppError('userId is required', 400);
        }
        const transactionDb = getTransactionDb();
        const transactions = transactionDb.collection('transactions');
        const currentWindow = getMonthWindow(filters.month);
        const trendMonthKeys = getRecentMonthKeys(6, currentWindow.monthKey);
        const trendWindow = getMonthWindow(trendMonthKeys[0]);
        const summaryRows = await transactions
            .aggregate([
            ...buildTransactionPipeline({
                userId: filters.userId,
                walletId: filters.walletId,
                startDate: currentWindow.startDate,
                endDate: currentWindow.endDate,
            }),
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
        const net = totalIncome - totalExpense;
        const trendRows = await transactions
            .aggregate([
            ...buildTransactionPipeline({
                userId: filters.userId,
                walletId: filters.walletId,
                startDate: trendWindow.startDate,
                endDate: currentWindow.endDate,
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
        const trendMap = new Map(trendRows.map((row) => {
            const monthKey = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
            return [monthKey, row];
        }));
        const trend = trendMonthKeys.map((monthKey) => {
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
        const breakdownRows = await transactions
            .aggregate([
            ...buildTransactionPipeline({
                userId: filters.userId,
                walletId: filters.walletId,
                startDate: currentWindow.startDate,
                endDate: currentWindow.endDate,
            }),
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
        const breakdown = breakdownRows.map((row) => ({
            categoryId: String(row._id ?? ''),
            name: String(row.name ?? 'Khác'),
            value: roundMoney(row.value),
            color: row.color ? String(row.color) : getCategoryColor(String(row.name ?? 'Khác')),
            transactionCount: Number(row.transactionCount ?? 0),
        }));
        return {
            currentMonth: currentWindow.monthKey,
            filters: {
                month: currentWindow.monthKey,
                walletId: filters.walletId ?? null,
            },
            summary: {
                totalIncome,
                totalExpense,
                net,
                netCashFlow: net,
                byCategory: breakdown.map((item) => ({
                    category_id: item.categoryId,
                    category_name: item.name,
                    total_amount: item.value,
                    transaction_count: item.transactionCount,
                    color: item.color,
                })),
                byWallet: [],
            },
            trend,
            breakdown,
        };
    }
}
exports.analyticsService = new AnalyticsService();
