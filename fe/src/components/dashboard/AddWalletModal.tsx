import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet } from 'lucide-react';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWalletModal: React.FC<AddWalletModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-2xl p-8"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Thêm ví mới</h2>
                <p className="text-sm text-gray-500">Kết nối tài khoản hoặc ví điện tử</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên ví</label>
                <input 
                  type="text" 
                  placeholder="VD: Thẻ tín dụng VIB" 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại ví</label>
                <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all appearance-none">
                  <option>Ngân hàng</option>
                  <option>Ví điện tử</option>
                  <option>Tiền mặt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số dư ban đầu</label>
                <input 
                  type="text" 
                  placeholder="0 ₫" 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
              >
                Hủy
              </button>
              <button className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/40 hover:brightness-110 transition-all duration-200">
                Lưu ví
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
