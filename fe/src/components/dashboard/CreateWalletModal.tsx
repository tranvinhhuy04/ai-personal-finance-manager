import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useWalletStore } from '@/store/useFinanceStore';
import type { WalletType } from '@/types/finance';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createWallet, isLoading } = useWalletStore();
  const [formData, setFormData] = useState<{
    walletType: WalletType;
    walletName: string;
    spendingLimit: string;
  }>({
    walletType: 'CARD',
    walletName: '',
    spendingLimit: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.walletName.trim()) {
      setError('Vui lòng nhập tên ví');
      return;
    }

    if (formData.spendingLimit && isNaN(parseFloat(formData.spendingLimit))) {
      setError('Hạn mức chi tiêu phải là số');
      return;
    }

    try {
      await createWallet({
        walletType: formData.walletType,
        walletName: formData.walletName,
        spendingLimit: formData.spendingLimit || undefined,
      });

      // Reset form and close
      setFormData({
        walletType: 'CARD',
        walletName: '',
        spendingLimit: '',
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Lỗi khi tạo ví'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Thêm ví mới</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Wallet Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại ví
            </label>
            <select
              value={formData.walletType}
              onChange={(e) =>
                setFormData({ ...formData, walletType: e.target.value as WalletType })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            >
              <option value="CARD">Thẻ ngân hàng</option>
              <option value="MOMO">MoMo</option>
              <option value="ZALOPAY">Zalo Pay</option>
              <option value="CASH">Tiền mặt</option>
            </select>
          </div>

          {/* Wallet Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên ví <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.walletName}
              onChange={(e) =>
                setFormData({ ...formData, walletName: e.target.value })
              }
              placeholder="VD: Ví tiền lương, Ví tiết kiệm..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Spending Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hạn mức chi tiêu (Tuỳ chọn)
            </label>
            <input
              type="number"
              value={formData.spendingLimit}
              onChange={(e) =>
                setFormData({ ...formData, spendingLimit: e.target.value })
              }
              placeholder="VD: 5000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              min="0"
              step="100000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống nếu không muốn giới hạn
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo ví'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
