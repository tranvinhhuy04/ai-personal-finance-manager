import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { useWalletStore } from '@/store/useFinanceStore';
import type { WalletType } from '@/types/finance';
import { useVietQRBanks } from '@/hooks/useVietQRBanks';

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
    balance: string;
  }>({
    walletType: 'CARD',
    walletName: '',
    balance: '',
  });
  const [error, setError] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

  const isCardWallet = formData.walletType === 'CARD';
  const { banks, isLoading: isLoadingBanks, isError: isErrorBanks, refetch } = useVietQRBanks(isCardWallet);

  const selectedBank = banks.find((bank) => bank.code === selectedBankCode) ?? null;

  useEffect(() => {
    if (!isCardWallet) {
      setSelectedBankCode('');
      setIsBankDropdownOpen(false);
    }
  }, [isCardWallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.walletName.trim()) {
      setError('Vui lòng nhập tên ví');
      return;
    }

    if (isCardWallet && !selectedBankCode) {
      setError('Vui lòng chọn ngân hàng cho ví thẻ');
      return;
    }

    if (formData.balance && (isNaN(parseFloat(formData.balance)) || parseFloat(formData.balance) < 0)) {
      setError('Số dư ban đầu phải là số không âm');
      return;
    }

    try {
      await createWallet({
        walletType: formData.walletType,
        walletName: formData.walletName,
        balance: formData.balance || '0',
      });

      // Reset form and close
      setFormData({
        walletType: 'CARD',
        walletName: '',
        balance: '',
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
              onChange={(e) => {
                const walletType = e.target.value as WalletType;
                setFormData({
                  ...formData,
                  walletType,
                  walletName: walletType === 'CARD' ? formData.walletName : '',
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            >
              <option value="CARD">Thẻ ngân hàng</option>
              <option value="MOMO">MoMo</option>
              <option value="ZALOPAY">Zalo Pay</option>
              <option value="CASH">Tiền mặt</option>
            </select>
          </div>

          {isCardWallet && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngân hàng <span className="text-red-500">*</span>
              </label>

              {isLoadingBanks && (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Đang tải danh sách ngân hàng...</span>
                </div>
              )}

              {isErrorBanks && (
                <div className="w-full p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2 text-red-700 text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Không tải được danh sách ngân hàng
                  </div>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="text-sm text-red-700 underline underline-offset-2"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {!isLoadingBanks && !isErrorBanks && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBankDropdownOpen((prev) => !prev)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left bg-white hover:border-emerald-400 transition-all"
                  >
                    {selectedBank ? (
                      <span className="flex items-center gap-2">
                        <img src={selectedBank.logo} alt={selectedBank.shortName} className="w-6 h-6 object-contain" />
                        <span>{selectedBank.shortName}</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">Chọn ngân hàng</span>
                    )}
                  </button>

                  {isBankDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {banks.map((bank) => (
                        <button
                          key={bank.code}
                          type="button"
                          onClick={() => {
                            setSelectedBankCode(bank.code);
                            setFormData((prev) => ({ ...prev, walletName: bank.shortName }));
                            setIsBankDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-emerald-50 transition-colors"
                        >
                          <img src={bank.logo} alt={bank.shortName} className="w-6 h-6 object-contain" />
                          <span className="text-sm text-gray-800">{bank.shortName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

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
              placeholder={isCardWallet ? 'Tự động theo ngân hàng hoặc nhập tên riêng' : 'VD: Ví tiền lương, Ví tiết kiệm...'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số dư ban đầu (Tuỳ chọn)
            </label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) =>
                setFormData({ ...formData, balance: e.target.value })
              }
              placeholder="VD: 5000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              min="0"
              step="1000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống nếu muốn khởi tạo với số dư 0đ
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
