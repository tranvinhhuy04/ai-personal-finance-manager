import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Link, Mail } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Render via portal so the modal escapes any parent stacking context
  // created by backdrop-filter (e.g. the sticky Header with backdrop-blur-md).
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-xl p-6"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">Chia sẻ quyền truy cập</h2>
            <p className="text-gray-500 text-sm mb-5">
              Mời người khác cùng quản lý hoặc xem dữ liệu tài chính của bạn.
            </p>

            <div className="space-y-3 mb-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Nhập email người nhận..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
                />
              </div>
              <button className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/30 hover:brightness-110 transition-all duration-200">
                Gửi lời mời
              </button>
            </div>

            <div className="relative flex items-center py-3">
              <div className="flex-grow border-t border-gray-200" />
              <span className="flex-shrink-0 mx-3 text-gray-400 text-xs font-medium uppercase">Hoặc chia sẻ qua liên kết</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <Link className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-600 truncate">https://fintech.app/share/x8y2z9</span>
              </div>
              <button className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors shrink-0">
                Sao chép
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

