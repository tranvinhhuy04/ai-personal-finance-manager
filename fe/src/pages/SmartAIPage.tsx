import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, UploadCloud, Search, FileText, ArrowRight, FileImage } from 'lucide-react';

export const SmartAIPage = () => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/40 flex items-center justify-center text-white">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trợ lý AI thông minh</h1>
          <p className="text-sm text-gray-500">Tự động hóa và phân tích tài chính với AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OCR Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FileImage className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Trích xuất Hóa đơn (OCR)</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Tải lên hóa đơn hoặc biên lai để AI tự động trích xuất thông tin giao dịch.</p>
          
          <div 
            className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-colors ${
              isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
          >
            <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">Kéo thả file vào đây</p>
            <p className="text-xs text-gray-500 mb-4">Hỗ trợ JPG, PNG, PDF (Tối đa 5MB)</p>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              Chọn tập tin
            </button>
          </div>
        </motion.div>

        {/* Q&A Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Hỏi đáp Tài chính</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Đặt câu hỏi về tình hình tài chính, xu hướng chi tiêu hoặc lời khuyên đầu tư.</p>
          
          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="VD: Tổng chi tiêu tháng này là bao nhiêu?" 
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gợi ý câu hỏi</p>
            {['Phân tích danh mục chi tiêu tháng 10', 'Làm sao để tiết kiệm 20% thu nhập?', 'Dự báo dòng tiền tháng tới'].map((q, i) => (
              <button key={i} className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors border border-transparent hover:border-gray-100 flex items-center justify-between group">
                {q}
                <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Text Analysis Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] lg:col-span-2 flex flex-col sm:flex-row gap-6"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Phân tích Báo cáo & Hợp đồng</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Dán nội dung văn bản dài để AI tóm tắt các điểm chính, rủi ro và cơ hội tài chính.</p>
            <textarea 
              rows={4}
              placeholder="Nhập hoặc dán nội dung văn bản vào đây..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all resize-none"
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-purple-900/20">
                <Sparkles className="w-4 h-4" />
                Phân tích ngay
              </button>
            </div>
          </div>
          <div className="w-full sm:w-1/3 bg-gray-50 rounded-2xl border border-gray-100 p-4 flex flex-col items-center justify-center text-center min-h-[200px]">
             <Sparkles className="w-8 h-8 text-gray-300 mb-3" />
             <p className="text-sm text-gray-500">Kết quả phân tích sẽ hiển thị tại đây.</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
