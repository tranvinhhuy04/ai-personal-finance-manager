import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Bell, Camera, Save, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const Profile = () => {
  const [activeTab, setActiveTab] = useState('general');
  const user = useAuthStore((s) => s.user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hồ sơ cá nhân</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar con */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <User className="w-5 h-5" />
            Thông tin chung
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Shield className="w-5 h-5" />
            Bảo mật & Mật khẩu
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Bell className="w-5 h-5" />
            Cài đặt thông báo
          </button>
        </div>

        {/* Nội dung */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] p-6 md:p-8">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-white shadow-md flex items-center justify-center text-emerald-700 text-3xl font-bold select-none">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="w-12 h-12" />}
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-emerald-600 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ảnh đại diện</h3>
                  <p className="text-sm text-gray-500">PNG, JPG tối đa 5MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                  <input type="text" defaultValue="Trần Vinh Huy" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" defaultValue="tranvinhhuy04@gmail.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                  <input type="tel" defaultValue="0987654321" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all" />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-emerald-900/20">
                  <Save className="w-4 h-4" />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Đổi mật khẩu</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all" />
                  </div>
                  <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Xác thực 2 bước (2FA)</h3>
                    <p className="text-sm text-gray-500 mt-1">Bảo vệ tài khoản của bạn bằng mã xác nhận qua ứng dụng Authenticator.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
               <p className="text-gray-500">Cài đặt thông báo đang được cập nhật...</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
