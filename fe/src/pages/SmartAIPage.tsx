import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, FileText, Loader2, Search, Sparkles, Wallet2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { formatVND } from '@/lib/utils';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import type {
  AIChatResponse,
  Category,
  ExtractedTransactionDraft,
  TransactionDirection,
  Wallet,
} from '@/types/finance';

const SUGGESTED_QUESTIONS = [
  'Tổng chi tiêu tháng này là bao nhiêu?',
  'Phân tích danh mục chi tiêu tháng này',
  'Làm sao để tiết kiệm 20% thu nhập?',
];

const QUICK_ENTRY_SAMPLES = [
  'Sáng ăn phở 40k, chiều gửi xe 10k',
  'Nhóm đi ăn 1tr2, tôi trả trước, mỗi người 300k',
  'Bán đồ cũ được 500k, nạp vào ví MoMo',
];

type EditableExtractedTransaction = {
  id: string;
  title: string;
  amount: string;
  type: 'expense' | 'income';
  categoryName: string;
  categoryId: string;
  walletId: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra khi gọi AI service.';
}

function normalizeType(type: string | undefined): 'expense' | 'income' {
  return type?.toLowerCase() === 'income' ? 'income' : 'expense';
}

function stripMarkdownCodeFence(input: string): string {
  const trimmed = input.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

function parseExtractedTransactions(raw: string): ExtractedTransactionDraft[] {
  const clean = stripMarkdownCodeFence(raw);
  const parsed = JSON.parse(clean);

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini output không phải JSON Array.');
  }

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      title: String(item.title ?? '').trim(),
      amount: Number(item.amount ?? 0),
      type: normalizeType(String(item.type ?? 'expense')),
      category: String(item.category ?? '').trim(),
    }))
    .filter((item) => item.title && Number.isFinite(item.amount) && item.amount > 0);
}

function mapDirection(type: 'expense' | 'income'): TransactionDirection {
  return type === 'income' ? 'INCOME' : 'EXPENSE';
}

function guessCategoryId(
  type: 'expense' | 'income',
  categoryName: string,
  expenseCategories: Category[],
  incomeCategories: Category[],
): string {
  const source = type === 'income' ? incomeCategories : expenseCategories;
  const normalized = categoryName.trim().toLowerCase();

  if (!source.length) {
    return '';
  }

  const exact = source.find((c) => c.name.trim().toLowerCase() === normalized);
  if (exact) {
    return exact.id;
  }

  const partial = source.find((c) => {
    const name = c.name.trim().toLowerCase();
    return normalized.includes(name) || name.includes(normalized);
  });

  return partial?.id ?? source[0].id;
}

export const SmartAIPage = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceError, setResourceError] = useState<string | null>(null);

  const [quickInput, setQuickInput] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [extractedTransactions, setExtractedTransactions] = useState<EditableExtractedTransaction[]>([]);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatResult, setChatResult] = useState<AIChatResponse | null>(null);

  const [analysisInput, setAnalysisInput] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIChatResponse | null>(null);

  const defaultWalletId = useMemo(() => wallets[0]?.id ?? '', [wallets]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setResourceLoading(true);
      setResourceError(null);

      try {
        const [walletList, expenseList, incomeList] = await Promise.all([
          apiClient.getWallets(),
          apiClient.getCategories('EXPENSE'),
          apiClient.getCategories('INCOME'),
        ]);

        if (!mounted) {
          return;
        }

        setWallets(walletList.filter((w) => w.status === 1));
        setExpenseCategories(expenseList.filter((c) => c.status === 1));
        setIncomeCategories(incomeList.filter((c) => c.status === 1));
      } catch (error) {
        if (mounted) {
          setResourceError(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setResourceLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleExtractTransactions = async () => {
    const input = quickInput.trim();
    if (!input) {
      return;
    }

    if (!wallets.length) {
      setExtractError('Không tìm thấy ví hoạt động. Vui lòng tạo ví trước khi nhập nhanh giao dịch.');
      return;
    }

    setExtractLoading(true);
    setExtractError(null);
    setExtractSuccess(null);
    setSaveSuccess(null);

    try {
      const result = await apiClient.extractTransactionsFromText(input);
      const parsed = parseExtractedTransactions(result.rawOutput);

      if (!parsed.length) {
        throw new Error('AI không trích xuất được giao dịch hợp lệ từ nội dung đã nhập.');
      }

      const prepared: EditableExtractedTransaction[] = parsed.map((txn, index) => {
        const type = normalizeType(txn.type);
        const categoryId = guessCategoryId(type, txn.category, expenseCategories, incomeCategories);
        return {
          id: `${Date.now()}-${index}`,
          title: txn.title,
          amount: String(Math.round(txn.amount)),
          type,
          categoryName: txn.category,
          categoryId,
          walletId: defaultWalletId,
        };
      });

      setExtractedTransactions(prepared);
      setExtractSuccess(`AI đã trích xuất ${prepared.length} giao dịch. Vui lòng kiểm tra và xác nhận trước khi lưu.`);
    } catch (error) {
      setExtractError(getErrorMessage(error));
      setExtractedTransactions([]);
    } finally {
      setExtractLoading(false);
    }
  };

  const handleUpdateExtractedTransaction = (
    id: string,
    patch: Partial<Omit<EditableExtractedTransaction, 'id'>>,
  ) => {
    setExtractedTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, ...patch } : txn)));
  };

  const handleSaveTransactions = async () => {
    if (!extractedTransactions.length) {
      setSaveError('Chưa có giao dịch nào để lưu.');
      return;
    }

    const invalid = extractedTransactions.find(
      (txn) => !txn.title.trim() || !Number.isFinite(Number(txn.amount)) || Number(txn.amount) <= 0 || !txn.categoryId || !txn.walletId,
    );

    if (invalid) {
      setSaveError('Vui lòng hoàn thiện đầy đủ tên giao dịch, số tiền > 0, danh mục và ví cho tất cả giao dịch.');
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await Promise.all(
        extractedTransactions.map((txn) =>
          apiClient.createTransaction({
            walletId: txn.walletId,
            categoryId: txn.categoryId,
            transactionType: mapDirection(txn.type),
            amount: String(Math.round(Number(txn.amount))),
            currency: 'VND',
            description: txn.title.trim(),
            occurredAt: new Date().toISOString(),
          }),
        ),
      );

      setSaveSuccess(`Đã lưu thành công ${extractedTransactions.length} giao dịch.`);
      setExtractedTransactions([]);
      setQuickInput('');
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setSaveLoading(false);
    }
  };

  const categoriesForType = (type: 'expense' | 'income') => (type === 'income' ? incomeCategories : expenseCategories);

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
          <p className="text-sm text-gray-500">Nhập nhanh giao dịch bằng ngôn ngữ tự nhiên, AI hiểu ngữ cảnh và tách giao dịch để bạn xác nhận trước khi lưu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          whileHover={{ y: -4 }}
          className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Nhập nhanh bằng Ngôn ngữ tự nhiên</h2>
          </div>

          <p className="mb-4 text-sm text-gray-500">Nhập một câu ngắn (VD: "Sáng ăn phở 40k") hoặc dán đoạn chat chia tiền nhóm. AI sẽ trích xuất giao dịch để bạn review.</p>

          <textarea
            rows={7}
            value={quickInput}
            onChange={(event) => setQuickInput(event.target.value)}
            placeholder="Nhập giao dịch hoặc dán đoạn chat chia tiền vào đây..."
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm transition-all focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_ENTRY_SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setQuickInput(sample)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                {sample}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={extractLoading || !quickInput.trim() || resourceLoading}
            onClick={() => void handleExtractTransactions()}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {extractLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Phân tích bằng AI
          </button>

          {resourceLoading ? <p className="mt-3 text-sm text-gray-500">Đang tải ví và danh mục...</p> : null}
          {resourceError ? <p className="mt-3 text-sm text-rose-600">{resourceError}</p> : null}
          {extractError ? <p className="mt-3 text-sm text-rose-600">{extractError}</p> : null}
          {extractSuccess ? <p className="mt-3 text-sm text-emerald-700">{extractSuccess}</p> : null}

          {extractedTransactions.length ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-900">Review & Confirm giao dịch</p>
                  <p className="mt-1 text-xs text-emerald-700">Bạn có thể chỉnh sửa mọi trường trước khi lưu vào hệ thống.</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  Gemini Extractor
                </span>
              </div>

              {extractedTransactions.map((txn, index) => {
                const availableCategories = categoriesForType(txn.type);
                return (
                  <div key={txn.id} className="space-y-3 rounded-xl border border-emerald-100 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Giao dịch #{index + 1}</p>
                      <select
                        value={txn.type}
                        onChange={(event) => {
                          const nextType = normalizeType(event.target.value);
                          const nextCategoryId = guessCategoryId(
                            nextType,
                            txn.categoryName,
                            expenseCategories,
                            incomeCategories,
                          );
                          handleUpdateExtractedTransaction(txn.id, {
                            type: nextType,
                            categoryId: nextCategoryId,
                          });
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                      >
                        <option value="expense">expense</option>
                        <option value="income">income</option>
                      </select>
                    </div>

                    <label className="space-y-1 text-xs">
                      <span className="text-gray-600">Tên giao dịch</span>
                      <input
                        value={txn.title}
                        onChange={(event) => handleUpdateExtractedTransaction(txn.id, { title: event.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="Tên giao dịch"
                      />
                    </label>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-xs">
                        <span className="text-gray-600">Số tiền</span>
                        <CurrencyInput
                          value={txn.amount}
                          onValueChange={(value) => handleUpdateExtractedTransaction(txn.id, { amount: value })}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          placeholder="VD: 40.000 đ"
                        />
                        <p className="text-[11px] text-emerald-700">{formatVND(Number(txn.amount || 0))}</p>
                      </label>

                      <label className="space-y-1 text-xs">
                        <span className="text-gray-600">Danh mục</span>
                        <select
                          value={txn.categoryId}
                          onChange={(event) => handleUpdateExtractedTransaction(txn.id, { categoryId: event.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">-- Chọn danh mục --</option>
                          {availableCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="space-y-1 text-xs">
                      <span className="text-gray-600">Nguồn tiền / Ví (bắt buộc)</span>
                      <select
                        value={txn.walletId}
                        onChange={(event) => handleUpdateExtractedTransaction(txn.id, { walletId: event.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">-- Chọn ví --</option>
                        {wallets.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.walletName} ({wallet.walletType})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}

              {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
              {saveSuccess ? <p className="text-sm text-emerald-700">{saveSuccess}</p> : null}

              <button
                type="button"
                disabled={saveLoading || !extractedTransactions.length}
                onClick={() => void handleSaveTransactions()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet2 className="h-4 w-4" />}
                Lưu tất cả giao dịch
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