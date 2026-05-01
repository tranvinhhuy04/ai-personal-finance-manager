import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileImage, FileText, Loader2, Search, Sparkles, UploadCloud } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { formatVND } from '@/lib/utils';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import type { AIChatResponse, AIOcrResponse } from '@/types/finance';

const SUGGESTED_QUESTIONS = [
  'Tổng chi tiêu tháng này là bao nhiêu?',
  'Phân tích danh mục chi tiêu tháng này',
  'Làm sao để tiết kiệm 20% thu nhập?',
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra khi gọi AI service.';
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export const SmartAIPage = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<AIOcrResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrForm, setOcrForm] = useState({
    merchantName: '',
    totalAmount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  });
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatResult, setChatResult] = useState<AIChatResponse | null>(null);
  const [analysisInput, setAnalysisInput] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIChatResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const handleOcrFile = async (file: File) => {
    setSelectedFile(file);
    setOcrLoading(true);
    setOcrError(null);
    setOcrSuccess(null);

    try {
      const result = await apiClient.ocrInvoice(file);
      setOcrResult(result);
      setOcrForm({
        merchantName: result.data.merchantName || '',
        totalAmount: result.data.totalAmount !== null ? String(result.data.totalAmount) : '',
        transactionDate: toDateInputValue(result.data.transactionDate),
      });
    } catch (error) {
      setOcrError(getErrorMessage(error));
      setOcrResult(null);
    } finally {
      setOcrLoading(false);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveOcrResult = async () => {
    if (!selectedFile) {
      setOcrError('Vui lòng tải ảnh hóa đơn trước khi lưu.');
      return;
    }

    setOcrSaving(true);
    setOcrError(null);
    setOcrSuccess(null);

    try {
      await apiClient.uploadInvoice(selectedFile, {
        merchantName: ocrForm.merchantName.trim(),
        totalAmount: Number(ocrForm.totalAmount || 0),
        transactionDate: ocrForm.transactionDate
          ? new Date(`${ocrForm.transactionDate}T00:00:00`).toISOString()
          : null,
        description: ocrForm.merchantName.trim() || 'Hóa đơn chờ xác nhận',
        extractedBy: 'paddle-ocr',
        reviewStatus: 'awaiting_manual_confirmation',
      });

      setOcrSuccess('Đã lưu hóa đơn thành công. Bạn có thể mở trang Hóa đơn để xác nhận và ghi nhận giao dịch.');
      window.setTimeout(() => navigate('/invoices'), 700);
    } catch (error) {
      setOcrError(getErrorMessage(error));
    } finally {
      setOcrSaving(false);
    }
  };

  const handleAsk = async (nextQuestion?: string) => {
    const resolvedQuestion = (nextQuestion ?? question).trim();
    if (!resolvedQuestion) return;

    setQuestion(resolvedQuestion);
    setChatLoading(true);
    setChatError(null);

    try {
      const result = await apiClient.askAI({ question: resolvedQuestion, useLlm: true });
      setChatResult(result);
    } catch (error) {
      setChatError(getErrorMessage(error));
      setChatResult(null);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyzeText = async () => {
    const trimmed = analysisInput.trim();
    if (!trimmed) return;

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const result = await apiClient.askAI({
        question: `Hãy đưa ra lời khuyên tài chính dựa trên nội dung sau: ${trimmed}`,
        context: {
          pastedText: trimmed.slice(0, 2000),
        },
        useLlm: true,
      });
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError(getErrorMessage(error));
      setAnalysisResult(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/40">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trợ lý AI thông minh</h1>
          <p className="text-sm text-gray-500">PaddleOCR (local) cho hóa đơn, kết hợp chatbot tài chính cho người dùng cuối.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          whileHover={{ y: -4 }}
          className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileImage className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Trích xuất Hóa đơn bằng Vision-Language</h2>
          </div>
          <p className="mb-6 text-sm text-gray-500">
            Ảnh hóa đơn sẽ được PaddleOCR (chạy local, offline) đọc chữ và bóc tách thành form thân thiện để bạn rà soát.
          </p>

          <div
            className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
              isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50'
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void handleOcrFile(file);
            }}
          >
            {ocrLoading ? <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-600" /> : <UploadCloud className="mb-3 h-10 w-10 text-gray-400" />}
            <p className="mb-1 text-sm font-medium text-gray-700">Kéo thả hóa đơn vào đây</p>
            <p className="mb-4 text-xs text-gray-500">Hỗ trợ JPG, PNG, WEBP · tối đa 8MB</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Chọn tập tin
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleOcrFile(file);
              }}
            />
          </div>

          {ocrError ? <p className="mt-3 text-sm text-rose-600">{ocrError}</p> : null}
          {ocrSuccess ? <p className="mt-3 text-sm text-emerald-700">{ocrSuccess}</p> : null}

          {ocrResult ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-900">Biểu mẫu đã điền sẵn</p>
                  <p className="mt-1 text-xs text-emerald-700">Bạn có thể sửa lại nếu AI nhận diện chưa đúng.</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  PaddleOCR
                </span>
              </div>

              <div className="grid gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-gray-600">Tên người bán</span>
                  <input
                    value={ocrForm.merchantName}
                    onChange={(event) => setOcrForm((prev) => ({ ...prev, merchantName: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2"
                    placeholder="VD: Bông Trà CN Phạm Viết Chánh"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-gray-600">Số tiền</span>
                    <CurrencyInput
                      value={ocrForm.totalAmount}
                      onValueChange={(value) => setOcrForm((prev) => ({ ...prev, totalAmount: value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2"
                      placeholder="VD: 58.000 đ"
                    />
                    <p className="text-xs text-emerald-700">{formatVND(Number(ocrForm.totalAmount || 0))}</p>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-gray-600">Ngày giao dịch</span>
                    <input
                      type="date"
                      value={ocrForm.transactionDate}
                      onChange={(event) => setOcrForm((prev) => ({ ...prev, transactionDate: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2"
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                disabled={ocrSaving || !selectedFile}
                onClick={() => void handleSaveOcrResult()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ocrSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Xác nhận & Lưu giao dịch
              </button>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Hỏi đáp Tài chính</h2>
          </div>
          <p className="mb-6 text-sm text-gray-500">AI phân tích intent câu hỏi, tận dụng dữ liệu dashboard và dùng Gemini để trả lời tự nhiên hơn.</p>

          <div className="relative mb-6">
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleAsk();
                }
              }}
              placeholder="VD: Tổng chi tiêu tháng này là bao nhiêu?"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-12 text-sm transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <button
              type="button"
              disabled={chatLoading || !question.trim()}
              onClick={() => void handleAsk()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>

          <div className="space-y-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Gợi ý câu hỏi</p>
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void handleAsk(suggestion)}
                className="group flex w-full items-center justify-between rounded-xl border border-transparent px-4 py-2.5 text-left text-sm text-gray-600 transition-colors hover:border-gray-100 hover:bg-gray-50 hover:text-blue-600"
              >
                {suggestion}
                <Sparkles className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>

          <div className="mt-6 min-h-[180px] rounded-2xl border border-gray-100 bg-gray-50 p-4">
            {chatError ? <p className="text-sm text-rose-600">{chatError}</p> : null}
            {chatResult ? (
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Intent: {chatResult.intent}</span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Confidence: {(chatResult.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="whitespace-pre-wrap">{chatResult.answer}</p>
                <div className="rounded-xl bg-white p-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-800">Hướng xử lý dữ liệu</p>
                  <p className="mt-1">{String(chatResult.queryPlan?.action ?? 'Phân tích dữ liệu tài chính và sinh phản hồi.')}</p>
                  <p className="mt-1 text-gray-500">Nguồn gợi ý: {String(chatResult.queryPlan?.target_service ?? 'ai-service')}</p>
                </div>
              </div>
            ) : !chatLoading ? (
              <div className="flex h-full items-center justify-center text-center">
                <p className="text-sm text-gray-500">Kết quả AI sẽ hiển thị ở đây theo cách ngắn gọn, dễ hiểu.</p>
              </div>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="lg:col-span-2 flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] sm:flex-row"
        >
          <div className="flex-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Phân tích Báo cáo & Hợp đồng</h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">Dán nội dung dài để AI sinh nhận định và lời khuyên tài chính sơ bộ.</p>
            <textarea
              rows={5}
              value={analysisInput}
              onChange={(event) => setAnalysisInput(event.target.value)}
              placeholder="Nhập hoặc dán nội dung văn bản vào đây..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm transition-all focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={analysisLoading || !analysisInput.trim()}
                onClick={() => void handleAnalyzeText()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-900/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Phân tích ngay
              </button>
            </div>
          </div>
          <div className="flex min-h-[220px] w-full flex-col justify-center rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center sm:w-1/3">
            {analysisError ? <p className="text-sm text-rose-600">{analysisError}</p> : null}
            {analysisResult ? (
              <div className="space-y-3 text-left text-sm text-gray-700">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">Intent: {analysisResult.intent}</span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">LLM: {analysisResult.llmUsed ? 'On' : 'Off'}</span>
                </div>
                <p className="whitespace-pre-wrap">{analysisResult.answer}</p>
              </div>
            ) : !analysisLoading ? (
              <>
                <Sparkles className="mb-3 h-8 w-8 self-center text-gray-300" />
                <p className="text-sm text-gray-500">Kết quả phân tích sẽ hiển thị tại đây.</p>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
