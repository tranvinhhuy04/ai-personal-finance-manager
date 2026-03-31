import React from 'react';
import { motion } from 'motion/react';
import { Layers, Plus, Calendar, ArrowRight } from 'lucide-react';
import { formatVND } from '@/lib/utils';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  nextBilling: string;
  status: string;
  category: string;
}

const subscriptions: Subscription[] = [];

export const Recurring = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Giao dịch định kỳ</h1>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-emerald-900/20">
          <Plus className="w-4 h-4" />
          Thêm giao dịch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {subscriptions.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Chưa có giao dịch định kỳ</p>
            <p className="text-sm text-gray-400 mt-1">Thêm giao dịch định kỳ để theo dõi các khoản chi cố định</p>
          </div>
        )}
        {subscriptions.map((sub) => (
          <div key={sub.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-bl-full -z-10"></div>
            
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-emerald-600">
                <Layers className="w-6 h-6" />
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                sub.status === 'Đang hoạt động' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {sub.status}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">{sub.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{sub.category}</p>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Số tiền</p>
                <p className="text-lg font-bold text-gray-900">{formatVND(sub.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Chu kỳ</p>
                <p className="text-sm font-medium text-gray-900">Hàng tháng</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Tiếp theo: {new Date(sub.nextBilling).toLocaleDateString('vi-VN')}</span>
              </div>
              <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
