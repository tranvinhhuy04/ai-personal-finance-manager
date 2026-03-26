import React from 'react';
import { motion } from 'motion/react';
import { Search, Filter, MoreHorizontal, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { mockTransactions } from '@/lib/mockData';

export const Transactions = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Giao dịch</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm giao dịch..." 
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all w-full sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            Lọc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{tx.id}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{tx.description}</td>
                  <td className="px-6 py-4 text-gray-500">{tx.category}</td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 font-medium ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4 text-gray-400" />}
                      {formatVND(Math.abs(tx.amount))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === 'Thành công' ? 'bg-emerald-100 text-emerald-800' : 
                      tx.status === 'Đang xử lý' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Hiển thị 1-{mockTransactions.length} của {mockTransactions.length} giao dịch</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Trước</button>
            <button className="px-3 py-1 border border-gray-200 rounded-lg bg-emerald-50 text-emerald-700 font-medium">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Sau</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
