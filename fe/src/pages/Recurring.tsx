import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Calendar,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Layers,
  PauseCircle,
  Plus,
  Repeat2,
  Trash2,
  Wallet,
} from 'lucide-react';
import { cn, formatVND } from '@/lib/utils';
import { useRecurringStore, useTransactionStore, useWalletStore } from '@/store/useFinanceStore';
import type { RecurringFrequency, RecurringRule, RecurringRuleStatus } from '@/types/finance';
const WEEK_DAY_OPTIONS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];
const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

function getFrequencyLabel(frequency: RecurringFrequency) {
  return frequency === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng';
}

function getScheduleLabel(rule: Pick<RecurringRule, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>) {
  if (rule.frequency === 'WEEKLY') {
    const day = WEEK_DAY_OPTIONS.find((item) => item.value === rule.dayOfWeek);
    return `Lặp vào ${day?.label ?? 'mỗi tuần'}`;
  }

  return `Lặp vào ngày ${rule.dayOfMonth ?? 1} hằng tháng`;
}

function getNextRunDate(rule: Pick<RecurringRule, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>) {
  const today = new Date();
  const next = new Date(today);
  next.setHours(9, 0, 0, 0);

  if (rule.frequency === 'WEEKLY') {
    const targetDay = rule.dayOfWeek ?? 1;
    const diff = (targetDay - today.getDay() + 7) % 7;
    next.setDate(today.getDate() + (diff === 0 ? 7 : diff));
    return next;
  }

  const targetDate = Math.min(rule.dayOfMonth ?? 1, 31);
  const currentMonthCandidate = new Date(today.getFullYear(), today.getMonth(), targetDate, 9, 0, 0, 0);

  if (currentMonthCandidate > today) {
    return currentMonthCandidate;
  }

  return new Date(today.getFullYear(), today.getMonth() + 1, targetDate, 9, 0, 0, 0);
}

function formatNextRun(rule: Pick<RecurringRule, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>) {
  return getNextRunDate(rule).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: RecurringRuleStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'ACTIVE'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      )}
    >
      {status === 'ACTIVE' ? 'Đang bật' : 'Tạm dừng'}
    </span>
  );
}

export const Recurring = () => {
  const { wallets, fetchWallets } = useWalletStore();
  const { categories, fetchCategories } = useTransactionStore();
  const {
    recurringRules: rules,
    isLoading: recurringLoading,
    error: recurringError,
    fetchRecurringRules,
    createRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
  } = useRecurringStore();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    walletId: '',
    categoryId: '',
    transactionType: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    frequency: 'MONTHLY' as RecurringFrequency,
    dayOfWeek: 1,
    dayOfMonth: 5,
    status: 'ACTIVE' as RecurringRuleStatus,
    note: '',
  });

  useEffect(() => {
    void Promise.all([fetchWallets(), fetchCategories(), fetchRecurringRules()]).catch(() => {
      setFeedback({
        type: 'error',
        text: 'Không thể tải dữ liệu ví, danh mục hoặc recurring rules. Vui lòng thử lại sau.',
      });
    });
  }, [fetchWallets, fetchCategories, fetchRecurringRules]);

  const categoryOptions = useMemo(
    () => categories.filter((item) => item.categoryType === formData.transactionType && item.status === 1),
    [categories, formData.transactionType]
  );

  useEffect(() => {
    if (!categoryOptions.length) {
      setFormData((current) => ({ ...current, categoryId: '' }));
      return;
    }

    const stillExists = categoryOptions.some((item) => item.id === formData.categoryId);
    if (!stillExists) {
      setFormData((current) => ({ ...current, categoryId: categoryOptions[0]?.id ?? '' }));
    }
  }, [categoryOptions, formData.categoryId]);

  useEffect(() => {
    if (wallets.length === 0) return;
    if (!formData.walletId) {
      setFormData((current) => ({ ...current, walletId: wallets[0]?.id ?? '' }));
    }
  }, [wallets, formData.walletId]);

  const activeRules = rules.filter((rule) => rule.status === 'ACTIVE');
  const estimatedMonthlyFlow = activeRules.reduce((sum, rule) => {
    const monthlyAmount = rule.frequency === 'WEEKLY' ? rule.amount * 4 : rule.amount;
    return sum + (rule.transactionType === 'INCOME' ? monthlyAmount : -monthlyAmount);
  }, 0);

  const handleCreateRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const amount = Number(formData.amount);
    if (!formData.walletId) {
      setFeedback({ type: 'error', text: 'Vui lòng chọn ví áp dụng cho giao dịch định kỳ.' });
      return;
    }

    if (!formData.categoryId) {
      setFeedback({ type: 'error', text: 'Vui lòng chọn danh mục phù hợp.' });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ type: 'error', text: 'Số tiền phải là một số lớn hơn 0.' });
      return;
    }

    try {
      await createRecurringRule({
        walletId: formData.walletId,
        categoryId: formData.categoryId,
        transactionType: formData.transactionType,
        amount,
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === 'WEEKLY' ? Number(formData.dayOfWeek) : null,
        dayOfMonth: formData.frequency === 'MONTHLY' ? Number(formData.dayOfMonth) : null,
        status: formData.status,
        note: formData.note.trim(),
      });

      setFeedback({ type: 'success', text: 'Đã lưu cấu hình giao dịch định kỳ vào MongoDB.' });
      setFormData((current) => ({
        ...current,
        amount: '',
        note: '',
        dayOfWeek: 1,
        dayOfMonth: 5,
        status: 'ACTIVE',
      }));
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể tạo recurring rule.',
      });
    }
  };

  const toggleRuleStatus = async (rule: RecurringRule) => {
    try {
      await updateRecurringRule(rule.id, {
        status: rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
      });
      setFeedback({ type: 'success', text: 'Đã cập nhật trạng thái recurring rule.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể cập nhật recurring rule.',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRecurringRule(ruleId);
      setFeedback({ type: 'success', text: 'Đã xóa recurring rule khỏi MongoDB.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể xóa recurring rule.',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Giao dịch định kỳ</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Tự động hóa các khoản thu/chi lặp lại để không bỏ sót giao dịch cố định.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/20">
          <Repeat2 className="h-4 w-4" />
          {activeRules.length} quy tắc đang bật
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cấu hình tự động hóa</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Tạo quy tắc để hệ thống tự sinh giao dịch đúng lịch.</p>
            </div>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Loại giao dịch</label>
                <select
                  value={formData.transactionType}
                  onChange={(event) => setFormData((current) => ({ ...current, transactionType: event.target.value as 'INCOME' | 'EXPENSE' }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="EXPENSE">Chi tiêu</option>
                  <option value="INCOME">Thu nhập</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Ví áp dụng</label>
                <select
                  value={formData.walletId}
                  onChange={(event) => setFormData((current) => ({ ...current, walletId: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Chọn ví --</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.walletName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Danh mục</label>
                <select
                  value={formData.categoryId}
                  onChange={(event) => setFormData((current) => ({ ...current, categoryId: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Số tiền</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.amount}
                  onChange={(event) => setFormData((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="VD: 1500000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Chu kỳ lặp</label>
                <select
                  value={formData.frequency}
                  onChange={(event) => setFormData((current) => ({ ...current, frequency: event.target.value as RecurringFrequency }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="WEEKLY">Hàng tuần</option>
                  <option value="MONTHLY">Hàng tháng</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Ngày thực hiện</label>
                {formData.frequency === 'WEEKLY' ? (
                  <select
                    value={formData.dayOfWeek}
                    onChange={(event) => setFormData((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {WEEK_DAY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={formData.dayOfMonth}
                    onChange={(event) => setFormData((current) => ({ ...current, dayOfMonth: Number(event.target.value) }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {MONTH_DAY_OPTIONS.map((day) => (
                      <option key={day} value={day}>
                        Ngày {day}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Ghi chú</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
                  placeholder="VD: Lương tháng, tiền nhà, gửi tiết kiệm..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as RecurringRuleStatus }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="ACTIVE">Bật</option>
                  <option value="PAUSED">Tắt</option>
                </select>
              </div>
            </div>

            {recurringError && !feedback && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {recurringError}
              </div>
            )}

            {feedback && (
              <div
                className={cn(
                  'rounded-xl px-3 py-2 text-sm',
                  feedback.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
                )}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Xem trước lịch chạy</p>
                <p className="text-sm text-emerald-700/90 dark:text-emerald-200/90">
                  {getScheduleLabel({
                    frequency: formData.frequency,
                    dayOfWeek: formData.frequency === 'WEEKLY' ? formData.dayOfWeek : null,
                    dayOfMonth: formData.frequency === 'MONTHLY' ? formData.dayOfMonth : null,
                  })}
                  {' · '}
                  Chạy tiếp theo vào {formatNextRun({
                    frequency: formData.frequency,
                    dayOfWeek: formData.frequency === 'WEEKLY' ? formData.dayOfWeek : null,
                    dayOfMonth: formData.frequency === 'MONTHLY' ? formData.dayOfMonth : null,
                  })}
                </p>
              </div>

              <button
                type="submit"
                disabled={recurringLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                {recurringLoading ? 'Đang lưu...' : 'Lưu quy tắc'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tổng quan tự động hóa</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300"><Activity className="h-4 w-4" /> Quy tắc đang bật</div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeRules.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300"><CircleDollarSign className="h-4 w-4" /> Dòng tiền dự kiến</div>
                <p className={cn('text-2xl font-bold', estimatedMonthlyFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {formatVND(estimatedMonthlyFlow)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300"><Clock3 className="h-4 w-4" /> Chu kỳ phổ biến</div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeRules.filter((rule) => rule.frequency === 'MONTHLY').length >= activeRules.filter((rule) => rule.frequency === 'WEEKLY').length ? 'Hàng tháng' : 'Hàng tuần'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quy tắc đang hoạt động</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Danh sách này đại diện cho các lệnh mà cron job backend sẽ quét mỗi ngày.</p>

            <div className="mt-4 space-y-3">
              {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center dark:border-slate-700">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800">
                    <Layers className="h-6 w-6 text-gray-400 dark:text-slate-400" />
                  </div>
                  <p className="font-medium text-gray-600 dark:text-slate-200">Chưa có giao dịch định kỳ</p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-slate-400">Tạo quy tắc đầu tiên để kích hoạt tự động hóa.</p>
                </div>
              ) : (
                rules.map((rule) => {
                  const walletName = wallets.find((wallet) => wallet.id === rule.walletId)?.walletName ?? 'Ví chưa xác định';
                  const categoryName = categories.find((category) => category.id === rule.categoryId)?.name ?? 'Danh mục chưa xác định';

                  return (
                    <div key={rule.id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{rule.note || `${rule.transactionType === 'INCOME' ? 'Thu định kỳ' : 'Chi định kỳ'} · ${categoryName}`}</p>
                            <StatusBadge status={rule.status} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1"><Wallet className="h-4 w-4" /> {walletName}</span>
                            <span className="inline-flex items-center gap-1"><Repeat2 className="h-4 w-4" /> {getFrequencyLabel(rule.frequency)}</span>
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {getScheduleLabel(rule)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={cn('text-lg font-bold', rule.transactionType === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                            {rule.transactionType === 'INCOME' ? '+' : '-'}{formatVND(rule.amount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Chạy tiếp: {formatNextRun(rule)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-slate-300">
                          <Calendar className="h-4 w-4" />
                          {categoryName}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleRuleStatus(rule)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            <PauseCircle className="h-4 w-4" />
                            {rule.status === 'ACTIVE' ? 'Tạm dừng' : 'Bật lại'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRule(rule.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
