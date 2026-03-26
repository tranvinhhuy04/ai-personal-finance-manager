import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send } from 'lucide-react';

export const AIChatbotPopover = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-100 text-xs font-medium text-emerald-700 relative"
            >
              Trợ lý AI sẵn sàng!
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-white border-b border-r border-gray-100 transform rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 hover:scale-105 transition-transform"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"></div>
          {isOpen ? <X className="w-6 h-6 relative z-10" /> : <Sparkles className="w-6 h-6 relative z-10" />}
        </button>
      </div>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-900 p-4 text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Oripio AI</h3>
                <p className="text-xs text-emerald-100">Trợ lý tài chính thông minh</p>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-700">
                  Chào bạn! Tôi có thể giúp gì cho việc quản lý tài chính của bạn hôm nay?
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Hỏi AI về tài chính..."
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
                />
                <button className="absolute right-2 p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
