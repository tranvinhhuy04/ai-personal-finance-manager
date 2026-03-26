import React from 'react';
import { motion } from 'motion/react';
import { Send, MessageSquare } from 'lucide-react';

export const Feedback = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-900/20 flex items-center justify-center text-white mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Gửi phản hồi</h1>
          <p className="text-gray-500">Chúng tôi luôn lắng nghe để cải thiện trải nghiệm của bạn.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề</label>
              <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all">
                <option>Góp ý tính năng</option>
                <option>Báo lỗi (Bug)</option>
                <option>Trải nghiệm người dùng</option>
                <option>Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mức độ hài lòng</label>
              <div className="flex items-center gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" className="text-2xl text-gray-300 hover:text-yellow-400 transition-colors focus:outline-none">
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung chi tiết</label>
              <textarea 
                rows={5} 
                placeholder="Hãy chia sẻ suy nghĩ của bạn..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all resize-none"
              ></textarea>
            </div>

            <button type="button" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-emerald-900/20">
              <Send className="w-4 h-4" />
              Gửi phản hồi
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
