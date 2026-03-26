import React from 'react';
import { motion } from 'motion/react';
import { Bell, Globe, Moon, Shield, Smartphone } from 'lucide-react';

export const Settings = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden max-w-3xl">
        <div className="divide-y divide-gray-100">
          
          {/* Giao diện */}
          <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Chế độ tối (Dark Mode)</h3>
                <p className="text-sm text-gray-500">Giao diện tối giúp giảm mỏi mắt</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Ngôn ngữ */}
          <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Ngôn ngữ</h3>
                <p className="text-sm text-gray-500">Tiếng Việt (Mặc định)</p>
              </div>
            </div>
            <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Thay đổi</button>
          </div>

          {/* Thông báo */}
          <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Thông báo đẩy</h3>
                <p className="text-sm text-gray-500">Nhận thông báo về giao dịch mới</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Thiết bị */}
          <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Thiết bị đã đăng nhập</h3>
                <p className="text-sm text-gray-500">Quản lý các thiết bị đang sử dụng tài khoản</p>
              </div>
            </div>
            <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Quản lý</button>
          </div>

        </div>
      </div>
    </motion.div>
  );
};
