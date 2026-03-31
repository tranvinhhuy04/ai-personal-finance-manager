import React from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useTransactionStore, useWalletStore } from '@/store/useFinanceStore';
import { CreateTransactionModal } from '@/components/dashboard/CreateTransactionModal';

export const Transactions = () => {
  const { transactions, categories, fetchTransactions, isLoading } =
    useTransactionStore();
  const { wallets } = useWalletStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    walletId: '',
    categoryId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        COMPLETED: {
          bg: 'bg-emerald-100',
          text: 'text-emerald-800',
          label: 'Thành công',
        },
        PENDING: {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'Đang xử lý',
        },
        FAILED: {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: 'Thất bại',
        },
        REVERSED: {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Đã hoàn',
        },
      };

    const badge = badges[status] || badges['PENDING'];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (
      filters.walletId &&
      tx.walletId !== filters.walletId
    ) {
      return false;
    }
    if (
      filters.categoryId &&
      tx.categoryId !== filters.categoryId
    ) {
      return false;
    }
    if (filters.status && tx.status !== filters.status) {
      return false;
    }
    if (
      filters.dateFrom &&
      new Date(tx.occurredAt) < new Date(filters.dateFrom)
    ) {
      return false;
    }
    if (
      filters.dateTo &&
      new Date(tx.occurredAt) > new Date(filters.dateTo)
    ) {
      return false;
    }
    if (
      searchText &&
      !tx.description?.toLowerCase().includes(searchText.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Giao dịch
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Ghi nhận giao dịch
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            Lọc
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Wallet Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Ví
                </label>
                <select
                  value={filters.walletId}
                  onChange={(e) =>
                    setFilters({ ...filters, walletId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tất cả --</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.walletName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Danh mục
                </label>
                <select
                  value={filters.categoryId}
                  onChange={(e) =>
                    setFilters({ ...filters, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tất cả --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Trạng thái
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tất cả --</option>
                  <option value="COMPLETED">Thành công</option>
                  <option value="PENDING">Đang xử lý</option>
                  <option value="FAILED">Thất bại</option>
                  <option value="REVERSED">Đã hoàn</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters({ ...filters, dateTo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() =>
                setFilters({
                  walletId: '',
                  categoryId: '',
                  status: '',
                  dateFrom: '',
                  dateTo: '',
                })
              }
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Xóa bộ lọc
            </button>
          </motion.div>
        )}

        {/* Transaction Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              Đang tải giao dịch...
            </div>
          ) : filteredTransactions && filteredTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4">Mã GD</th>
                      <th className="px-6 py-4">Ngày</th>
                      <th className="px-6 py-4">Mô tả</th>
                      <th className="px-6 py-4">Danh mục</th>
                      <th className="px-6 py-4 text-right">Số tiền</th>
                      <th className="px-6 py-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((tx) => {
                      const category = categories.find(
                        (c) => c.id === tx.categoryId
                      );
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {tx.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(tx.occurredAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {tx.description || '(Không có mô tả)'}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {category?.name}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div
                              className={`flex items-center justify-end gap-1 font-medium ${
                                tx.transactionType === 'INCOME'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {tx.transactionType === 'INCOME' ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                              {formatVND(parseFloat(tx.amount))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(tx.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500">
                Hiển thị {filteredTransactions.length} giao dịch
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Không có giao dịch nào
            </div>
          )}
        </div>
      </motion.div>

      <CreateTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
