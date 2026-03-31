import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useWalletStore } from '@/store/useFinanceStore';
import { apiClient } from '@/lib/apiClient';

interface EditWalletModalProps {
  walletId: string;
  onClose: () => void;
}

export const EditWalletModal: React.FC<EditWalletModalProps> = ({
  walletId,
  onClose,
}) => {
  const { wallets } = useWalletStore();
  const wallet = wallets.find((w) => w.id === walletId);
  const [status, setStatus] = useState<number>(wallet?.status || 1);
  const [spendingLimit, setSpendingLimit] = useState(
    wallet?.spendingLimit?.toString() || ''
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (wallet) {
      setStatus(wallet.status);
      setSpendingLimit(wallet.spendingLimit?.toString() || '');
    }
  }, [wallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (spendingLimit && isNaN(parseFloat(spendingLimit))) {
      setError('Hạn mức chi tiêu phải là số');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.updateWallet(walletId, {
        status,
        spendingLimit: spendingLimit ? parseFloat(spendingLimit) : null,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật ví');
    } finally {
      setIsLoading(false);
    }
  };

  if (!wallet) return null;

  const getStatusLabel = (status: number) => {
    if (status === 1) return 'Hoạt động';
    if (status === 2) return 'Khóa';
    return 'Vô hiệu';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Sửa ví</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Wallet Info */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Tên ví</p>
            <p className="text-lg font-bold text-gray-900">{wallet.walletName}</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            >
              <option value={1}>Hoạt động</option>
              <option value={2}>Khóa</option>
              <option value={0}>Vô hiệu</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Trạng thái hiện tại: <strong>{getStatusLabel(wallet.status)}</strong>
            </p>
          </div>

          {/* Spending Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hạn mức chi tiêu
            </label>
            <input
              type="number"
              value={spendingLimit}
              onChange={(e) => setSpendingLimit(e.target.value)}
              placeholder="Để trống nếu không có giới hạn"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              min="0"
              step="100000"
            />
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
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
