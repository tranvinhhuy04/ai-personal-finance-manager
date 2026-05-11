import { AppError } from '../errors/AppError';
import { RecurringRuleModel } from '../models/recurring-rule.model';

const RECURRING_STATUSES = ['ACTIVE', 'PAUSED'] as const;

function normalizeStatus(input: unknown, fallback: string): 'ACTIVE' | 'PAUSED' {
  return requireEnum<'ACTIVE' | 'PAUSED'>(input, RECURRING_STATUSES, 'status', fallback as 'ACTIVE' | 'PAUSED');
}

function requireEnum<T extends string>(
  input: unknown,
  allowed: readonly T[],
  field: string,
  fallback?: T,
): T {
  if ((input === undefined || input === null || input === '') && fallback !== undefined) {
    return fallback;
  }

  const normalized = String(input ?? '').trim().toUpperCase() as T;
  if (!allowed.includes(normalized)) {
    throw new AppError(`${field} must be one of: ${allowed.join(', ')}`, 400);
  }

  return normalized;
}

function parseAmount(input: unknown) {
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('amount must be a positive number', 400);
  }
  return amount;
}

function parseDayOfWeek(input: unknown, required: boolean) {
  if (input === undefined || input === null || input === '') {
    if (required) throw new AppError('day_of_week is required for WEEKLY rules', 400);
    return null;
  }

  const day = Number(input);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new AppError('day_of_week must be an integer from 0 to 6', 400);
  }

  return day;
}

function parseDayOfMonth(input: unknown, required: boolean) {
  if (input === undefined || input === null || input === '') {
    if (required) throw new AppError('day_of_month is required for MONTHLY rules', 400);
    return null;
  }

  const day = Number(input);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new AppError('day_of_month must be an integer from 1 to 31', 400);
  }

  return day;
}

function toRecurringRuleResponse(rule: any) {
  const walletId = String(rule.wallet_id ?? '');
  const categoryId = rule.category_id ? String(rule.category_id) : null;
  const transactionType = String(rule.transaction_type ?? 'EXPENSE') as 'INCOME' | 'EXPENSE';
  const amount = Number(rule.amount?.toString?.() ?? 0);
  const frequency = String(rule.frequency ?? 'MONTHLY') as 'WEEKLY' | 'MONTHLY';
  const dayOfWeek = rule.day_of_week ?? null;
  const dayOfMonth = rule.day_of_month ?? null;
  const status = String(rule.status ?? 'ACTIVE') as 'ACTIVE' | 'PAUSED';
  const note = String(rule.note ?? '');

  return {
    id: rule._id.toString(),
    userId: String(rule.user_id ?? ''),
    walletId,
    categoryId,
    transactionType,
    amount,
    currency: String(rule.currency ?? 'VND'),
    frequency,
    dayOfWeek,
    dayOfMonth,
    status,
    note,
    lastRunOn: rule.last_run_on ?? null,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

class RecurringRuleService {
  async listRecurringRules(userId: string) {
    if (!userId) throw new AppError('user_id is required', 400);

    const rules = await RecurringRuleModel.find({ user_id: userId })
      .sort({ status: 1, createdAt: -1 })
      .lean();

    return rules.map(toRecurringRuleResponse);
  }

  async createRecurringRule(userId: string, payload: Record<string, unknown>) {
    if (!userId) throw new AppError('user_id is required', 400);

    const walletId = String(payload.wallet_id ?? payload.walletId ?? '').trim();
    const categoryIdRaw = payload.category_id ?? payload.categoryId ?? null;
    const categoryId = categoryIdRaw ? String(categoryIdRaw).trim() : null;
    const transactionType = requireEnum(payload.transaction_type ?? payload.transactionType, ['INCOME', 'EXPENSE'] as const, 'transaction_type');
    const amount = parseAmount(payload.amount);
    const frequency = requireEnum(payload.frequency, ['WEEKLY', 'MONTHLY'] as const, 'frequency');
    const status = requireEnum(payload.status, ['ACTIVE', 'PAUSED'] as const, 'status', 'ACTIVE');
    const dayOfWeek = parseDayOfWeek(payload.day_of_week ?? payload.dayOfWeek, frequency === 'WEEKLY');
    const dayOfMonth = parseDayOfMonth(payload.day_of_month ?? payload.dayOfMonth, frequency === 'MONTHLY');
    const note = String(payload.note ?? '').trim() || null;

    if (!walletId) {
      throw new AppError('wallet_id is required', 400);
    }

    const created = await RecurringRuleModel.create({
      user_id: userId,
      wallet_id: walletId,
      category_id: categoryId,
      transaction_type: transactionType,
      amount,
      currency: String(payload.currency ?? 'VND').trim() || 'VND',
      frequency,
      day_of_week: frequency === 'WEEKLY' ? dayOfWeek : null,
      day_of_month: frequency === 'MONTHLY' ? dayOfMonth : null,
      note,
      status,
      last_run_on: null,
    });

    return toRecurringRuleResponse(created);
  }

  async updateRecurringRule(ruleId: string, userId: string, payload: Record<string, unknown>) {
    const rule = await RecurringRuleModel.findOne({ _id: ruleId, user_id: userId });

    if (!rule) {
      throw new AppError('Recurring rule not found', 404);
    }

    const nextFrequency = payload.frequency !== undefined
      ? requireEnum(payload.frequency, ['WEEKLY', 'MONTHLY'] as const, 'frequency')
      : rule.frequency;

    if (payload.wallet_id !== undefined || payload.walletId !== undefined) {
      const walletId = String(payload.wallet_id ?? payload.walletId ?? '').trim();
      if (!walletId) throw new AppError('wallet_id cannot be empty', 400);
      rule.wallet_id = walletId;
    }

    if (payload.category_id !== undefined || payload.categoryId !== undefined) {
      const categoryIdRaw = payload.category_id ?? payload.categoryId ?? null;
      rule.category_id = categoryIdRaw ? String(categoryIdRaw).trim() : null;
    }

    if (payload.transaction_type !== undefined || payload.transactionType !== undefined) {
      rule.transaction_type = requireEnum(payload.transaction_type ?? payload.transactionType, ['INCOME', 'EXPENSE'] as const, 'transaction_type');
    }

    if (payload.amount !== undefined) {
      rule.amount = parseAmount(payload.amount) as any;
    }

    if (payload.currency !== undefined) {
      const currency = String(payload.currency ?? '').trim();
      if (!currency) throw new AppError('currency cannot be empty', 400);
      rule.currency = currency;
    }

    rule.frequency = nextFrequency;
    rule.day_of_week = parseDayOfWeek(payload.day_of_week ?? payload.dayOfWeek ?? rule.day_of_week, nextFrequency === 'WEEKLY');
    rule.day_of_month = parseDayOfMonth(payload.day_of_month ?? payload.dayOfMonth ?? rule.day_of_month, nextFrequency === 'MONTHLY');

    if (nextFrequency === 'WEEKLY') {
      rule.day_of_month = null;
    } else {
      rule.day_of_week = null;
    }

    if (payload.status !== undefined) {
      rule.status = normalizeStatus(payload.status, rule.status);
    }

    if (payload.note !== undefined) {
      rule.note = String(payload.note ?? '').trim() || null;
    }

    await rule.save();
    return toRecurringRuleResponse(rule);
  }

  async deleteRecurringRule(ruleId: string, userId: string) {
    const deleted = await RecurringRuleModel.findOneAndDelete({ _id: ruleId, user_id: userId }).lean();

    if (!deleted) {
      throw new AppError('Recurring rule not found', 404);
    }

    return { success: true, id: ruleId };
  }
}

export const recurringRuleService = new RecurringRuleService();
