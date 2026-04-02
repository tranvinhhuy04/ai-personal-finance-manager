import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCcw, X } from 'lucide-react';
import { useWalletStore, useTransactionStore } from '@/store/useFinanceStore';
import { formatCurrencyVND } from '@/utils/formatters';

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { wallets, updateWalletBalance } = useWalletStore();
  const {
    createTransaction,
    categories,
    fetchCategories,
    isLoading,
    isFetchingCategories,
    categoryError,
  } = useTransactionStore();

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    walletId: '',
    transactionType: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    categoryId: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError('');
    void fetchCategories().catch(() => {
      setError('Không tải được danh mục giao dịch');
    });
  }, [isOpen, fetchCategories]);

  const selectedWallet = wallets.find((w) => w.id === formData.walletId);
  const availableCategories = useMemo(
    () => categories.filter((c) => c.categoryType === formData.transactionType && c.status === 1),
    [categories, formData.transactionType]
  );

  useEffect(() => {
    if (formData.categoryId && !availableCategories.some((category) => category.id === formData.categoryId)) {
      setFormData((prev) => ({ ...prev, categoryId: '' }));
    }
  }, [availableCategories, formData.categoryId]);

  const validateStep = (currentStep: Step): boolean => {
    setError('');

    if (currentStep === 1) {
      if (!formData.walletId) {
        setError('Vui lòng chọn ví');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.categoryId) {
        setError('Vui lòng chọn danh mục');
        return false;
      }
      if (!formData.amount || isNaN(parseFloat(formData.amount))) {
        setError('Vui lòng nhập số tiền hợp lệ');
        return false;
      }
      if (parseFloat(formData.amount) <= 0) {
        setError('Số tiền phải lớn hơn 0');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      if (step < 3) {
        setStep((step + 1) as Step);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep(3)) return;

    try {
      const transaction = await createTransaction({
        walletId: formData.walletId,
        categoryId: formData.categoryId,
        transactionType: formData.transactionType,
        amount: parseFloat(formData.amount).toString(),
        currency: 'VND',
        description: formData.description,
      });

      // Optimistic wallet balance update
      const wallet = wallets.find((w) => w.id === formData.walletId);
      if (wallet) {
        const currentBalance = parseFloat(wallet.balance);
        const amount = parseFloat(formData.amount);
        const newBalance =
          formData.transactionType === 'EXPENSE'
            ? currentBalance - amount
            : currentBalance + amount;
        updateWalletBalance(formData.walletId, newBalance.toString());
      }

      // Reset and close
      setStep(1);
      setFormData({
        walletId: '',
        transactionType: 'EXPENSE',
        categoryId: '',
        amount: '',
        description: '',
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Lỗi khi tạo giao dịch'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            Ghi nhận giao dịch
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    s === step
                      ? 'bg-emerald-600 text-white shadow-lg scale-110'
                      : s < step
                        ? 'bg-emerald-200 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-8 h-1 mx-2 rounded transition-all ${
                      s < step ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-3">
            {step === 1 && 'Bước 1: Chọn ví'}
            {step === 2 && 'Bước 2: Chọn danh mục và số tiền'}
            {step === 3 && 'Bước 3: Xác nhận'}
          </p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Step 1: Select Wallet */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn ví
                </label>
                <select
                  value={formData.walletId}
                  onChange={(e) =>
                    setFormData({ ...formData, walletId: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">-- Chọn ví --</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.walletName} - {formatCurrencyVND(parseFloat(wallet.balance))}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWallet && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-xs text-emerald-600 font-medium mb-1">
                    Số dư hiện tại
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrencyVND(parseFloat(selectedWallet.balance))}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Category & Amount */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại giao dịch
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        transactionType: 'EXPENSE',
                        categoryId: '',
                      })
                    }
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                      formData.transactionType === 'EXPENSE'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        transactionType: 'INCOME',
                        categoryId: '',
                      })
                    }
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                      formData.transactionType === 'INCOME'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Danh mục
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Hiển thị danh mục {formData.transactionType === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void fetchCategories()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Tải lại
                    </button>
                  </div>

                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    disabled={isFetchingCategories}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">
                      {isFetchingCategories ? 'Đang tải danh mục...' : '-- Chọn danh mục --'}
                    </option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {!isFetchingCategories && availableCategories.length === 0 && !categoryError && (
                    <p className="text-xs text-amber-600">
                      Chưa có danh mục phù hợp với loại giao dịch đang chọn.
                    </p>
                  )}

                  {isFetchingCategories && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang đồng bộ danh mục từ hệ thống...
                    </div>
                  )}
                </div>
                {categoryError && (
                  <p className="mt-2 text-xs text-red-600">{categoryError}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số tiền
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-right text-2xl"
                    min="0"
                    step="1000"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    VND
                  </span>
                </div>
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả (Tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="VD: Ăn trưa tại nhà hàng..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ví</span>
                  <span className="font-bold text-gray-900">
                    {selectedWallet?.walletName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Loại</span>
                  <span
                    className={`font-bold ${
                      formData.transactionType === 'INCOME'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formData.transactionType === 'INCOME'
                      ? 'Thu nhập'
                      : 'Chi tiêu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Danh mục</span>
                  <span className="font-bold text-gray-900">
                    {categories.find((c) => c.id === formData.categoryId)
                      ?.name}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between">
                  <span className="text-gray-600 font-medium">Số tiền</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatCurrencyVND(parseFloat(formData.amount) || 0)}
                  </span>
                </div>
              </div>

              {formData.description && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-medium mb-1">Mô tả</p>
                  <p className="text-gray-900">{formData.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Quay lại
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                Tiếp theo
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
