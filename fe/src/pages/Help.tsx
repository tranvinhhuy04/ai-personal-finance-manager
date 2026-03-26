import React from 'react';
import { motion } from 'motion/react';
import { Search, Book, MessageCircle, FileText, Phone } from 'lucide-react';

export const Help = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">Chúng tôi có thể giúp gì cho bạn?</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm câu hỏi, hướng dẫn..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center cursor-pointer group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <Book className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Hướng dẫn sử dụng</h3>
          <p className="text-sm text-gray-500">Tìm hiểu cách sử dụng các tính năng cơ bản</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center cursor-pointer group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Câu hỏi thường gặp</h3>
          <p className="text-sm text-gray-500">Giải đáp các thắc mắc phổ biến nhất</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center cursor-pointer group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Chat với hỗ trợ</h3>
          <p className="text-sm text-gray-500">Trò chuyện trực tiếp với đội ngũ CSKH</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center cursor-pointer group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <Phone className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Hotline</h3>
          <p className="text-sm text-gray-500">Gọi điện trực tiếp 1900 xxxx</p>
        </div>
      </div>
    </motion.div>
  );
};
