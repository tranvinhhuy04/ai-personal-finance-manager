import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Loader2, Send, Sparkles, User2, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const QUICK_PROMPTS = [
  'Tổng chi tiêu tháng này là bao nhiêu?',
  'Thu nhập tháng này của tôi thế nào?',
  'Cho tôi một lời khuyên để tiết kiệm hơn',
];

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  meta?: string;
};

export const AIChatbotPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Chào bạn! Tôi có thể trả lời nhanh về chi tiêu, thu nhập và gợi ý tài chính dựa trên dữ liệu hiện tại.',
      meta: 'PhoBERT intent + analytics context',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  const buildContext = async () => {
    try {
      const analytics = await apiClient.getAnalyticsDashboard();
      return {
        summary: analytics.summary,
        trend: analytics.trend.slice(-3),
        breakdown: analytics.breakdown.slice(0, 5),
      };
    } catch {
      return {};
    }
  };

  const handleSend = async (prompt?: string) => {
    const question = (prompt ?? inputValue).trim();
    if (!question || isSending) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: question },
    ]);
    setInputValue('');
    setIsSending(true);

    try {
      const context = await buildContext();
      const result = await apiClient.askAI({ question, context, useLlm: true });
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          meta: `Intent: ${result.intent} • ${(result.confidence * 100).toFixed(0)}%`,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Không thể kết nối AI service lúc này.',
          meta: 'Fallback error',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-md"
            >
              Trợ lý AI sẵn sàng!
              <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 transform border-b border-r border-gray-100 bg-white"></div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg shadow-emerald-900/40 transition-transform hover:scale-105"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"></div>
          {isOpen ? <X className="relative z-10 h-6 w-6" /> : <Sparkles className="relative z-10 h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:w-96"
            style={{ height: '540px', maxHeight: 'calc(100vh - 120px)' }}
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-700 to-teal-900 p-4 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Fintech AI</h3>
                <p className="text-xs text-emerald-100">Chat trực tiếp với `ai-service`</p>
              </div>
            </div>

            <div className="border-b border-gray-100 bg-white px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Bot className="h-4 w-4 text-emerald-700" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                      message.role === 'user'
                        ? 'rounded-br-none bg-emerald-600 text-white'
                        : 'rounded-tl-none border border-gray-100 bg-white text-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.meta ? (
                      <p className={`mt-1 text-[11px] ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {message.meta}
                      </p>
                    ) : null}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                      <User2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Bot className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none border border-gray-100 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI đang phân tích...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white p-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Hỏi AI về tài chính..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-10 text-sm transition-all focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
                <button
                  type="button"
                  disabled={isSending || !inputValue.trim()}
                  onClick={() => void handleSend()}
                  className="absolute right-2 rounded-lg p-1.5 text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
