import React, { useEffect } from 'react';
import { X, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({ isOpen, onClose }) => {
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
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] text-white p-8"
          >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/40 mb-6 mx-auto">
              <Zap className="w-8 h-8 text-emerald-300" />
            </div>

            <h2 className="relative z-10 text-2xl font-bold text-center mb-2 tracking-tight">Nâng cấp lên gói Pro</h2>
            <p className="relative z-10 text-gray-400 text-center text-sm mb-8">
              Mở khóa toàn bộ tính năng quản lý tài chính cao cấp và tối ưu hóa dòng tiền của bạn.
            </p>

            <div className="relative z-10 space-y-4 mb-8">
              {[
                'Không giới hạn số lượng ví kết nối',
                'Báo cáo phân tích chuyên sâu hàng tháng',
                'Tự động phân loại giao dịch bằng AI',
                'Hỗ trợ ưu tiên 24/7',
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-200">{benefit}</span>
                </div>
              ))}
            </div>

            <button className="relative z-10 w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/40 hover:brightness-110 transition-all duration-200">
              Nâng cấp ngay - 99.000 ₫/tháng
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
