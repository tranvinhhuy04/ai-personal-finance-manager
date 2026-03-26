import React from 'react';
import { motion } from 'motion/react';
import { FileText, Download, Eye, MoreHorizontal } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { mockTransactions } from '@/lib/mockData';

export const Invoices = () => {
  // Lọc ra các giao dịch có thể coi là hóa đơn (chi tiêu, tiện ích)
  const invoices = mockTransactions.filter(tx => tx.amount < 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hóa đơn</h1>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <FileText className="w-4 h-4" />
          Tạo hóa đơn mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FileText className="w-6 h-6" />
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                invoice.status === 'Thành công' ? 'bg-emerald-100 text-emerald-800' : 
                invoice.status === 'Đang xử lý' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {invoice.status}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">{invoice.description}</h3>
            <p className="text-sm text-gray-500 mb-4">Mã HĐ: {invoice.id}</p>
            
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tổng tiền</p>
                <p className="text-xl font-bold text-gray-900">{formatVND(Math.abs(invoice.amount))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Ngày lập</p>
                <p className="text-sm font-medium text-gray-900">{new Date(invoice.date).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                Tải xuống
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
