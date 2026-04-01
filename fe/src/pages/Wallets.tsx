import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { useWalletStore } from '@/store/useFinanceStore';
import { formatVND } from '@/lib/utils';
import { CreateWalletModal } from '@/components/dashboard/CreateWalletModal';
import { EditWalletModal } from '@/components/dashboard/EditWalletModal';

export const Wallets = () => {
  const { wallets, isLoading, error, fetchWallets } = useWalletStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const didFetchRef = useRef(false);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    const load = async () => {
      try {
        await fetchWallets();
        setIsError(false);
      } catch {
        setIsError(true);
      }
    };

    void load();
  }, []);

  const getWalletTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CARD: 'Thẻ ngân hàng',
      MOMO: 'MoMo',
      ZALOPAY: 'Zalo Pay',
      CASH: 'Tiền mặt',
    };
    return labels[type] || type;
  };

  const getWalletTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CARD: 'bg-blue-50 border-blue-200 text-blue-700',
      MOMO: 'bg-red-50 border-red-200 text-red-700',
      ZALOPAY: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      CASH: 'bg-green-50 border-green-200 text-green-700',
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const getStatusBadge = (status: number) => {
    if (status === 1) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Hoạt động</span>;
    } else if (status === 2) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Khóa</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Vô hiệu</span>;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ví của tôi</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Thêm ví mới
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            Đang tải dữ liệu ví...
          </div>
        ) : isError ? (
          <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-200">
            <p className="text-red-700 font-medium">Không thể tải danh sách ví</p>
            <p className="text-red-600 text-sm mt-2">{error ?? 'Vui lòng thử lại sau'}</p>
          </div>
        ) : wallets && wallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((wallet) => (
              <motion.div
                key={wallet.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{wallet.walletName}</h3>
                      <p className={`text-xs font-medium mt-1 px-2 py-1 rounded-md border ${getWalletTypeColor(wallet.walletType)}`}>
                        {getWalletTypeLabel(wallet.walletType)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingWallet(wallet.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa ví"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa ví"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Số dư</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatVND(parseFloat(wallet.balance))}
                    </p>
                  </div>

                  {/* Spending Limit */}
                  {wallet.spendingLimit && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 font-medium mb-1">Hạn mức chi tiêu</p>
                          <p className="text-lg font-bold text-blue-700">
                            {formatVND(parseFloat(wallet.spendingLimit))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-blue-600 font-medium mb-1">Còn lại</p>
                          <p className="text-lg font-bold text-blue-700">
                            {formatVND(
                              parseFloat(wallet.spendingLimit) -
                                parseFloat(wallet.balance)
                            )}
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (parseFloat(wallet.balance) /
                                parseFloat(wallet.spendingLimit)) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status & Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div>{getStatusBadge(wallet.status)}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {wallet.status === 1 ? (
                        <Unlock className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      v{wallet.version}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 mb-4">Bạn chưa có ví nào</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Tạo ví đầu tiên
            </button>
          </div>
        )}
      </motion.div>

      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {editingWallet && (
        <EditWalletModal
          walletId={editingWallet}
          onClose={() => setEditingWallet(null)}
        />
      )}
    </>
  );
};
