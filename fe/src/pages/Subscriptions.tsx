import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Plus, CreditCard, AlertCircle } from 'lucide-react';
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

export const Subscriptions = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quản lý Đăng ký</h1>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" />
          Thêm dịch vụ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tổng quan */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 rounded-3xl text-white shadow-lg shadow-emerald-900/20">
            <h3 className="text-emerald-100 font-medium mb-2">Tổng chi phí hàng tháng</h3>
            <p className="text-3xl font-bold mb-6">{formatVND(subscriptions.reduce((acc, curr) => acc + curr.amount, 0))}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-100">Đang hoạt động</span>
                <span className="font-medium">{subscriptions.filter(s => s.status === 'Đang hoạt động').length} dịch vụ</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-100">Sắp đến hạn</span>
                <span className="font-medium">{subscriptions.filter(s => s.status === 'Chờ thanh toán').length} dịch vụ</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Phương thức thanh toán
            </h3>
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-gray-900 rounded flex items-center justify-center text-white text-[10px] font-bold">VISA</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">•••• 4242</p>
                  <p className="text-xs text-gray-500">Hết hạn 12/25</p>
                </div>
              </div>
              <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">Sửa</button>
            </div>
          </div>
        </div>

        {/* Danh sách */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Danh sách dịch vụ</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {subscriptions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <ShieldCheck className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Chưa có dịch vụ đăng ký</p>
                <p className="text-sm text-gray-400 mt-1">Thêm dịch vụ để theo dõi chi phí hàng tháng</p>
              </div>
            )}
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{sub.name}</h3>
                    <p className="text-sm text-gray-500">{sub.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-gray-900">{formatVND(sub.amount)}</p>
                    <p className="text-xs text-gray-500">Hàng tháng</p>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-1 ${
                      sub.status === 'Đang hoạt động' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sub.status}
                    </span>
                    <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                      {sub.status === 'Chờ thanh toán' && <AlertCircle className="w-3 h-3 text-yellow-600" />}
                      {new Date(sub.nextBilling).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
