import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowDownToLine,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  PiggyBank,
  Plus,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { cn, formatCurrency } from '@/lib/utils';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import type { CreateSavingInput, SavingPackage, SavingProductType, SettleSavingType, Wallet as WalletItem } from '@/types/finance';

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

type DepositFormState = {
  sourceWalletId: string;
  amount: string;
};

type SettleFormState = {
  settleType: SettleSavingType;
  destinationWalletId: string;
  amount: string;
};

const productMeta: Record<SavingProductType, { label: string; icon: typeof PiggyBank; card: string; chip: string }> = {
  SAVING: {
    label: 'Tiết kiệm',
    icon: PiggyBank,
    card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/25',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  INVESTMENT: {
    label: 'Đầu tư',
    icon: TrendingUp,
    card: 'border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:border-violet-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/25',
    chip: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300',
  },
};

const initialCreateForm: CreateSavingInput = {
  name: '',
  type: 'SAVING',
  targetAmount: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
};

const initialSettleForm: SettleFormState = {
  settleType: 'FULL',
  destinationWalletId: '',
  amount: '',
};

export function SavingInvestment() {
  const [tab, setTab] = useState<SavingProductType>('SAVING');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSavingInput>(initialCreateForm);

  const [depositTarget, setDepositTarget] = useState<SavingPackage | null>(null);
  const [depositForm, setDepositForm] = useState<DepositFormState>({ sourceWalletId: '', amount: '' });

  const [settleTarget, setSettleTarget] = useState<SavingPackage | null>(null);
  const [settleForm, setSettleForm] = useState<SettleFormState>(initialSettleForm);

  const savingsQuery = useQuery({
    queryKey: ['savings', 'all'],
    queryFn: () => apiClient.getSavings(),
    staleTime: 60 * 1000,
  });

  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: () => apiClient.getWallets(),
    staleTime: 60 * 1000,
    select: (items: WalletItem[]) => items.filter((wallet) => wallet.status === 1),
  });

  const savings = savingsQuery.data ?? [];
  const wallets = walletsQuery.data ?? [];
  const loading = savingsQuery.isLoading || walletsQuery.isLoading;

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['savings'] }),
      queryClient.invalidateQueries({ queryKey: ['wallets'] }),
    ]);
  }, [queryClient]);

  useEffect(() => {
    const loadError = savingsQuery.error ?? walletsQuery.error;
    if (!loadError) return;

    setToast({
      type: 'error',
      message: loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu tiết kiệm/đầu tư.',
    });
  }, [savingsQuery.error, walletsQuery.error]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredSavings = useMemo(
    () => savings.filter((item) => item.type === tab).sort((a, b) => Number(a.status === 'SETTLED') - Number(b.status === 'SETTLED')),
    [savings, tab]
  );

  const summary = useMemo(() => {
    const activeItems = savings.filter((item) => item.status === 'ACTIVE');
    const totalCurrent = activeItems.reduce((sum, item) => sum + Number(item.currentAmount ?? 0), 0);
    const totalTarget = activeItems.reduce((sum, item) => sum + Number(item.targetAmount ?? 0), 0);
    const completion = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;

    return {
      activeCount: activeItems.length,
      totalCurrent,
      totalTarget,
      completion,
    };
  }, [savings]);

  const handleCreateSaving = async () => {
    if (!createForm.name?.trim()) {
      setToast({ type: 'error', message: 'Vui lòng nhập tên gói.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.createSaving({
        ...createForm,
        targetAmount: createForm.targetAmount || null,
        endDate: createForm.endDate || null,
      });
      setIsCreateOpen(false);
      setCreateForm(initialCreateForm);
      await refreshData();
      setToast({ type: 'success', message: 'Đã tạo gói tiết kiệm/đầu tư mới.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Tạo gói thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositTarget) return;
    if (!depositForm.sourceWalletId || !depositForm.amount) {
      setToast({ type: 'error', message: 'Vui lòng chọn ví nguồn và nhập số tiền.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.depositToSaving(depositTarget.id, depositForm);
      setDepositTarget(null);
      setDepositForm({ sourceWalletId: '', amount: '' });
      await refreshData();
      setToast({ type: 'success', message: 'Nạp tiền thành công, thông báo realtime sẽ xuất hiện ngay.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Nạp tiền thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    if (!settleTarget) return;

    if (settleForm.settleType === 'PARTIAL') {
      if (!settleForm.destinationWalletId) {
        setToast({ type: 'error', message: 'Vui lòng chọn ví nhận tiền cho tất toán bán phần.' });
        return;
      }

      const partialAmount = Number(settleForm.amount);
      if (!Number.isFinite(partialAmount) || partialAmount <= 0) {
        setToast({ type: 'error', message: 'Vui lòng nhập số tiền tất toán bán phần hợp lệ.' });
        return;
      }

      if (partialAmount > Number(settleTarget.currentAmount ?? 0)) {
        setToast({ type: 'error', message: 'Số tiền tất toán bán phần không được vượt quá số dư trong gói.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiClient.settleSaving(settleTarget.id, {
        settleType: settleForm.settleType,
        destinationWalletId: settleForm.destinationWalletId || null,
        amount: settleForm.settleType === 'PARTIAL' ? settleForm.amount : null,
      });
      setSettleTarget(null);
      setSettleForm(initialSettleForm);
      await refreshData();
      setToast({
        type: 'success',
        message: settleForm.settleType === 'PARTIAL' ? 'Đã tất toán bán phần thành công.' : 'Đã tất toán toàn phần thành công.',
      });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Tất toán thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={cn(
            'fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg',
            toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tiền gửi & Đầu tư</h1>
            <p className="mt-1 text-sm text-slate-500">Tạo mục tiêu, nạp tiền từ ví và tất toán linh hoạt khi cần.</p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Tạo gói mới
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <PiggyBank className="h-5 w-5 text-emerald-600" />
              <span className="text-sm">Gói đang hoạt động</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.activeCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <BadgeDollarSign className="h-5 w-5 text-sky-600" />
              <span className="text-sm">Tổng tích lũy</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalCurrent)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <Target className="h-5 w-5 text-violet-600" />
              <span className="text-sm">Mục tiêu đang đặt</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalTarget)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Tiến độ hoàn thành</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.completion}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {(['SAVING', 'INVESTMENT'] as SavingProductType[]).map((item) => {
            const meta = productMeta[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  tab === item ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-14 text-center text-slate-500 shadow-sm">Đang tải dữ liệu gói...</div>
        ) : filteredSavings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
            <p className="text-base font-medium text-slate-700">Chưa có gói {tab === 'SAVING' ? 'tiết kiệm' : 'đầu tư'} nào.</p>
            <p className="mt-2 text-sm text-slate-500">Tạo gói mới để bắt đầu kế hoạch tài chính của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredSavings.map((item) => {
              const meta = productMeta[item.type];
              const Icon = meta.icon;
              const progress = item.targetAmount && item.targetAmount > 0
                ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
                : 0;

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  className={cn('rounded-[24px] border p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] dark:shadow-[0_20px_56px_-32px_rgba(2,6,23,0.95)]', meta.card)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                          <Icon className="h-5 w-5 text-slate-800 dark:text-slate-200" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.name}</h3>
                          <div className={cn('mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', meta.chip)}>
                            {meta.label}
                          </div>
                        </div>
                      </div>

                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      )}>
                        {item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã tất toán'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Đã tích lũy</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(item.currentAmount)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Mục tiêu</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{item.targetAmount ? formatCurrency(item.targetAmount) : 'Chưa đặt'}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span>Tiến độ</span>
                        <span>{item.targetAmount ? `${progress}%` : 'Linh hoạt'}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-slate-900 transition-all dark:bg-emerald-500"
                          style={{ width: `${item.targetAmount ? progress : 20}%` }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Bắt đầu: {new Date(item.startDate).toLocaleDateString('vi-VN')}</span>
                        <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Kết thúc: {item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={item.status !== 'ACTIVE'}
                        onClick={() => {
                          setDepositTarget(item);
                          setDepositForm({ sourceWalletId: wallets[0]?.id ?? '', amount: '' });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-slate-700"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        Nạp tiền
                      </button>
                      <button
                        type="button"
                        disabled={item.status !== 'ACTIVE'}
                        onClick={() => {
                          setSettleTarget(item);
                          setSettleForm({
                            settleType: 'FULL',
                            destinationWalletId: wallets[0]?.id ?? '',
                            amount: '',
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:disabled:text-slate-500"
                      >
                        <Wallet className="h-4 w-4" />
                        Tất toán
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {(isCreateOpen || depositTarget || settleTarget) && <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" />}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Tạo gói mới</h3>
            <div className="mt-4 space-y-4">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên gói"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value as SavingProductType }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-600"
                >
                  <option value="SAVING" className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">Tiết kiệm</option>
                  <option value="INVESTMENT" className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">Đầu tư</option>
                </select>
                <CurrencyInput
                  value={String(createForm.targetAmount ?? '')}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, targetAmount: value }))}
                  placeholder="Mục tiêu (VND)"
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={createForm.startDate ?? ''}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  type="date"
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
                <input
                  value={createForm.endDate ?? ''}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  type="date"
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
              <button type="button" onClick={() => void handleCreateSaving()} disabled={submitting} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:bg-emerald-300">{submitting ? 'Đang lưu...' : 'Tạo gói'}</button>
            </div>
          </div>
        </div>
      )}

      {depositTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Nạp tiền vào {depositTarget.name}</h3>
            <div className="mt-4 space-y-4">
              <select
                value={depositForm.sourceWalletId}
                onChange={(e) => setDepositForm((prev) => ({ ...prev, sourceWalletId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-600"
              >
                <option value="" className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">Chọn ví nguồn</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id} className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    {wallet.walletName} - {formatCurrency(Number(wallet.balance))}
                  </option>
                ))}
              </select>

              <CurrencyInput
                value={depositForm.amount}
                onValueChange={(value) => setDepositForm((prev) => ({ ...prev, amount: value }))}
                placeholder="Số tiền muốn nạp"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDepositTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
              <button type="button" onClick={() => void handleDeposit()} disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400">{submitting ? 'Đang xử lý...' : 'Xác nhận nạp'}</button>
            </div>
          </div>
        </div>
      )}

      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Tất toán {settleTarget.name}</h3>
            <p className="mt-2 text-sm text-slate-500">Chọn tất toán toàn phần hoặc bán phần để rút tiền từ gói về ví.</p>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSettleForm((prev) => ({ ...prev, settleType: 'FULL', amount: '' }))}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    settleForm.settleType === 'FULL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Toàn phần
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettleForm((prev) => ({
                      ...prev,
                      settleType: 'PARTIAL',
                      destinationWalletId: prev.destinationWalletId || (wallets[0]?.id ?? ''),
                    }))
                  }
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    settleForm.settleType === 'PARTIAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Bán phần
                </button>
              </div>

              <select
                value={settleForm.destinationWalletId}
                onChange={(e) => setSettleForm((prev) => ({ ...prev, destinationWalletId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-600"
              >
                {settleForm.settleType === 'FULL' ? (
                  <option value="" className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">Không chuyển về ví</option>
                ) : (
                  <option value="" className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">Chọn ví nhận tiền</option>
                )}
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id} className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    {wallet.walletName}
                  </option>
                ))}
              </select>

              {settleForm.settleType === 'PARTIAL' && (
                <div className="space-y-2">
                  <CurrencyInput
                    value={settleForm.amount}
                    onValueChange={(value) => setSettleForm((prev) => ({ ...prev, amount: value }))}
                    placeholder="Số tiền tất toán bán phần"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-500">Số dư hiện tại trong gói: {formatCurrency(Number(settleTarget.currentAmount ?? 0))}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setSettleTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
              <button
                type="button"
                onClick={() => void handleSettle()}
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:bg-emerald-300"
              >
                {submitting ? 'Đang tất toán...' : settleForm.settleType === 'PARTIAL' ? 'Xác nhận bán phần' : 'Tất toán toàn phần'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
