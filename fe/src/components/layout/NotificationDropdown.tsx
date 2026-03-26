import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Wallet, FileText, TrendingUp, X } from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const notifications = [
    {
      id: 1,
      icon: <Wallet className="w-4 h-4 text-emerald-600" />,
      bg: 'bg-emerald-50',
      title: 'Biến động số dư',
      desc: 'Nhận lương tháng 3: +25.000.000 ₫',
      time: '2 giờ trước',
      unread: true,
    },
    {
      id: 2,
      icon: <FileText className="w-4 h-4 text-orange-600" />,
      bg: 'bg-orange-50',
      title: 'Hóa đơn sắp tới hạn',
      desc: 'Tiền điện tháng 3: 1.250.000 ₫',
      time: '5 giờ trước',
      unread: true,
    },
    {
      id: 3,
      icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
      bg: 'bg-blue-50',
      title: 'Báo cáo tuần',
      desc: 'Chi tiêu tuần này giảm 15% so với tuần trước.',
      time: '1 ngày trước',
      unread: false,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Thông báo</h3>
              <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Đánh dấu đã đọc</button>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.map((notif) => (
                <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${notif.unread ? 'bg-emerald-50/30' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.bg}`}>
                    {notif.icon}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className={`text-sm font-medium ${notif.unread ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</h4>
                      {notif.unread && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{notif.desc}</p>
                    <span className="text-[10px] text-gray-400 font-medium">{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 text-center border-t border-gray-100 bg-gray-50/50">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Xem tất cả</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
