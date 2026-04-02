import React from 'react';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, Filter, Plus, Search, Settings2 } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useTransactionStore, useWalletStore } from '@/store/useFinanceStore';
import { CreateTransactionModal } from '@/components/dashboard/CreateTransactionModal';
import { CategoryManagerModal } from '../components/dashboard/CategoryManagerModal';

export const Transactions = () => {
  const { transactions, categories, fetchTransactions, fetchCategories, isLoading, error } =
    useTransactionStore();
  const { wallets } = useWalletStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isError, setIsError] = useState(false);
  const didFetchRef = useRef(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    walletId: '',
    categoryId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    const load = async () => {
      try {
        await Promise.all([fetchTransactions(), fetchCategories()]);
        setIsError(false);
      } catch {
        setIsError(true);
      }
    };

    void load();
  }, []);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        COMPLETED: {
          bg: 'bg-emerald-100 dark:bg-emerald-950/40',
          text: 'text-emerald-800 dark:text-emerald-300',
          label: 'Thành công',
        },
        PENDING: {
          bg: 'bg-yellow-100 dark:bg-amber-950/40',
          text: 'text-yellow-800 dark:text-amber-300',
          label: 'Đang xử lý',
        },
        FAILED: {
          bg: 'bg-red-100 dark:bg-red-950/40',
          text: 'text-red-800 dark:text-red-300',
          label: 'Thất bại',
        },
        REVERSED: {
          bg: 'bg-gray-100 dark:bg-slate-800',
          text: 'text-gray-800 dark:text-slate-200',
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

  const copyTransactionId = async (transactionId: string) => {
    try {
      await navigator.clipboard.writeText(transactionId);
      setCopiedTxId(transactionId);
      window.setTimeout(() => {
        setCopiedTxId((current) => (current === transactionId ? null : current));
      }, 1600);
    } catch (error) {
      console.error('Failed to copy transaction id', error);
    }
  };

  const formatTransactionCode = (transactionId: string) =>
    `TX-${String(transactionId).slice(-6).toUpperCase()}`;

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Giao dịch
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <Settings2 className="w-5 h-5" />
              Quản lý danh mục
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <Plus className="w-5 h-5" />
              Ghi nhận giao dịch
            </button>
          </div>
        </div>

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/40">
            <p className="text-red-700 text-sm font-medium">
              Không thể tải lịch sử giao dịch
            </p>
            <p className="text-red-600 text-xs mt-1">{error ?? 'Vui lòng thử lại sau'}</p>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 transition-all focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
            className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
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
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Xóa bộ lọc
            </button>
          </motion.div>
        )}

        {/* Transaction Table */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-gray-500 dark:text-slate-300">
              Đang tải giao dịch...
            </div>
          ) : filteredTransactions && filteredTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/50 font-medium text-gray-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                    <tr>
                      <th className="px-6 py-4">Mã GD</th>
                      <th className="px-6 py-4">Ngày</th>
                      <th className="px-6 py-4">Mô tả</th>
                      <th className="px-6 py-4">Danh mục</th>
                      <th className="px-6 py-4 text-right">Số tiền</th>
                      <th className="px-6 py-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredTransactions.map((tx) => {
                      const category = categories.find(
                        (c) => c.id === tx.categoryId
                      );
                      return (
                        <tr key={tx.id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/60">
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => void copyTransactionId(tx.id)}
                              title={`Nhấp để sao chép toàn bộ ID: ${tx.id}`}
                              className="inline-flex flex-col items-start rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-emerald-200 hover:bg-emerald-50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
                            >
                              <span className="font-semibold tracking-[0.18em] text-gray-900 dark:text-white">
                                {formatTransactionCode(tx.id)}
                              </span>
                              <span className="text-[11px] text-gray-500 dark:text-slate-400">
                                {copiedTxId === tx.id ? 'Đã sao chép ID đầy đủ' : 'Bấm để copy ID'}
                              </span>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-slate-300">
                            {new Date(tx.occurredAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-100">
                            {tx.description || '(Không có mô tả)'}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-slate-300">
                            {category?.name}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div
                              className={`flex items-center justify-end gap-1 font-medium ${
                                tx.transactionType === 'INCOME'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
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
              <div className="border-t border-gray-100 px-6 py-4 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-300">
                Hiển thị {filteredTransactions.length} giao dịch
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-500 dark:text-slate-300">
              Không có giao dịch nào
            </div>
          )}
        </div>
      </motion.div>

      <CreateTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </>
  );
};
