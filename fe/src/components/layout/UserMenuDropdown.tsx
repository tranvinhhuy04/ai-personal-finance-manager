import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface UserMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({ isOpen, onClose }) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/auth');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-[60] overflow-hidden dark:bg-slate-900 dark:border-slate-700"
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-900">{user?.name || 'Người dùng'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
            <div className="p-2">
              <Link to="/profile" onClick={onClose} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <User className="w-4 h-4 text-gray-500" />
                Hồ sơ cá nhân
              </Link>
              <Link to="/settings" onClick={onClose} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <Settings className="w-4 h-4 text-gray-500" />
                Cài đặt tài khoản
              </Link>
            </div>
            <div className="p-2 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
