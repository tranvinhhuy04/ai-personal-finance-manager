import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileImage,
  Loader2,
  RefreshCcw,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { formatVND } from '@/lib/utils';
import type { Category, ConfirmInvoiceInput, Invoice, Wallet } from '@/types/finance';

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

const STATUS_STYLES: Record<Invoice['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  DELETED: 'bg-slate-100 text-slate-700',
};

function extractString(data: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function extractAmount(data: Record<string, unknown>) {
  const keys = ['totalAmount', 'amount', 'total', 'grandTotal'];
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const cleaned = Number(value.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(cleaned)) return cleaned;
    }
  }
  return 0;
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }
  return date.toISOString().slice(0, 16);
}

export const Invoices = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createdObjectUrlsRef = useRef<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmForm, setConfirmForm] = useState<ConfirmInvoiceInput>({
    walletId: '',
    categoryId: '',
    amount: '',
    transactionType: 'EXPENSE',
    currency: 'VND',
    description: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    extractedData: {},
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceData, walletData, categoryData] = await Promise.all([
        apiClient.getInvoices(),
        apiClient.getWallets(),
        apiClient.getCategories().catch(() => []),
      ]);

      setInvoices(invoiceData);
      setWallets(walletData);
      setCategories(categoryData);
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể tải danh sách hóa đơn',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const missingInvoices = invoices.filter((invoice) => invoice.imageUrl && !imagePreviews[invoice.id]);
    if (missingInvoices.length === 0) return;

    let cancelled = false;

    void Promise.all(
      missingInvoices.map(async (invoice) => {
        try {
          const objectUrl = await apiClient.getProtectedFileUrl(invoice.imageUrl);
          return [invoice.id, objectUrl] as const;
        } catch {
          return [invoice.id, ''] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) {
        entries.forEach(([, objectUrl]) => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        });
        return;
      }

      const successfulEntries = entries.filter(([, objectUrl]) => Boolean(objectUrl));
      successfulEntries.forEach(([, objectUrl]) => createdObjectUrlsRef.current.push(objectUrl));

      setImagePreviews((prev) => {
        const next = { ...prev };
        successfulEntries.forEach(([invoiceId, objectUrl]) => {
          next[invoiceId] = objectUrl;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [imagePreviews, invoices]);

  useEffect(() => {
    if (!selectedInvoice) return;

    const suggestedAmount = extractAmount(selectedInvoice.extractedData);
    const suggestedMerchant = extractString(
      selectedInvoice.extractedData,
      ['merchantName', 'merchant_name', 'vendor', 'invoiceName'],
      ''
    );
    const suggestedDescription = extractString(
      selectedInvoice.extractedData,
      ['description', 'merchantName', 'merchant_name', 'vendor', 'invoiceName'],
      'Xác nhận giao dịch từ hóa đơn'
    );
    const suggestedOccurredAt = extractString(
      selectedInvoice.extractedData,
      ['transactionDate', 'date', 'occurredAt', 'occurred_at'],
      selectedInvoice.createdAt
    );

    setConfirmForm({
      walletId: wallets[0]?.id ?? '',
      categoryId: '',
      amount: suggestedAmount > 0 ? String(suggestedAmount) : '',
      transactionType: 'EXPENSE',
      currency: 'VND',
      description: suggestedDescription,
      occurredAt: toInputDateTime(suggestedOccurredAt),
      extractedData: {
        ...selectedInvoice.extractedData,
        merchantName: suggestedMerchant,
        merchant_name: suggestedMerchant,
      },
    });
  }, [selectedInvoice, wallets]);

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.categoryType === 'EXPENSE'),
    [categories]
  );

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadPhase('Google Vision + Gemini đang phân tích hóa đơn...');

    try {
      let extractedData: Record<string, unknown> = {
        originalFileName: file.name,
        uploadedAt: new Date().toISOString(),
        reviewStatus: 'awaiting_manual_confirmation',
      };
      let usedAiExtraction = false;

      try {
        const ocrResult = await apiClient.ocrInvoice(file);
        extractedData = {
          ...extractedData,
          ...ocrResult.data,
          description:
            String(ocrResult.data.merchantName ?? '').trim() || 'Xác nhận giao dịch từ hóa đơn',
          extractedBy: 'google-vision-gemini',
        };
        usedAiExtraction = Boolean(
          ocrResult.data.merchantName || ocrResult.data.totalAmount || ocrResult.data.transactionDate
        );
      } catch (ocrError) {
        console.warn('AI OCR failed, fallback to manual review:', ocrError);
      }

      setUploadPhase('Đang lưu hóa đơn vào hệ thống...');
      const invoice = await apiClient.uploadInvoice(file, extractedData);

      setInvoices((prev) => [invoice, ...prev]);
      setSelectedInvoice(invoice);
      setToast({
        type: 'success',
        message: usedAiExtraction
          ? 'Tải hóa đơn thành công. AI đã trích xuất dữ liệu để bạn xác nhận nhanh.'
          : 'Tải hóa đơn thành công. Bạn vẫn có thể rà soát và nhập tay nếu OCR chưa đọc được.',
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Tải hóa đơn thất bại',
      });
    } finally {
      setUploading(false);
      setUploadPhase('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleDelete = useCallback(
    async (invoiceId: string) => {
      if (!window.confirm('Ẩn hóa đơn này khỏi danh sách? Dữ liệu vẫn được lưu dưới dạng soft-delete.')) {
        return;
      }

      try {
        await apiClient.deleteInvoice(invoiceId);
        setInvoices((prev) => prev.filter((item) => item.id !== invoiceId));
        if (selectedInvoice?.id === invoiceId) {
          setSelectedInvoice(null);
        }
        setToast({ type: 'success', message: 'Đã soft-delete hóa đơn.' });
      } catch (error) {
        setToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Không thể xóa hóa đơn',
        });
      }
    },
    [selectedInvoice]
  );

  const handleReject = useCallback(async () => {
    if (!selectedInvoice) return;

    try {
      const updated = await apiClient.updateInvoice(selectedInvoice.id, {
        status: 'REJECTED',
        extractedData: selectedInvoice.extractedData,
      });

      setInvoices((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedInvoice(updated);
      setToast({ type: 'success', message: 'Hóa đơn đã được đánh dấu từ chối.' });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể cập nhật hóa đơn',
      });
    }
  }, [selectedInvoice]);

  const handleConfirm = useCallback(async () => {
    if (!selectedInvoice) return;

    if (!confirmForm.walletId || !confirmForm.categoryId || !confirmForm.amount) {
      setToast({
        type: 'error',
        message: 'Vui lòng chọn ví, danh mục và nhập số tiền trước khi xác nhận.',
      });
      return;
    }

    setConfirming(true);
    try {
      const merchantName = extractString(
        (confirmForm.extractedData ?? {}) as Record<string, unknown>,
        ['merchantName', 'merchant_name'],
        confirmForm.description || ''
      );

      const result = await apiClient.confirmInvoice(selectedInvoice.id, {
        ...confirmForm,
        extractedData: {
          ...(confirmForm.extractedData ?? {}),
          merchantName,
          merchant_name: merchantName,
          totalAmount: Number(confirmForm.amount || 0),
          transactionDate: confirmForm.occurredAt ? new Date(confirmForm.occurredAt).toISOString() : null,
          description: confirmForm.description,
        },
      });

      setInvoices((prev) => prev.map((item) => (item.id === result.invoice.id ? result.invoice : item)));
      setSelectedInvoice(result.invoice);
      setToast({ type: 'success', message: 'Đã tạo giao dịch bất biến từ hóa đơn.' });
      await loadData();
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Xác nhận hóa đơn thất bại',
      });
    } finally {
      setConfirming(false);
    }
  }, [confirmForm, loadData, selectedInvoice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[70] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quản lý hóa đơn</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload ảnh hóa đơn, rà soát dữ liệu và xác nhận thành giao dịch bất biến.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6">
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-300 bg-white px-6 py-10 text-center"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) void handleUpload(file);
          }}
        >
          {uploading ? <Loader2 className="h-8 w-8 animate-spin text-emerald-600" /> : <UploadCloud className="h-8 w-8 text-emerald-600" />}
          <div>
            <p className="text-base font-semibold text-gray-900">Kéo thả ảnh hóa đơn để AI OCR tự động đọc dữ liệu</p>
            <p className="mt-1 text-sm text-gray-500">Hỗ trợ JPG, PNG, WEBP · tối đa 8MB</p>
            {uploading && uploadPhase ? (
              <p className="mt-2 text-xs font-medium text-emerald-700">{uploadPhase}</p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl bg-white p-12 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <FileImage className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-base font-semibold text-gray-900">Chưa có hóa đơn nào</p>
          <p className="mt-1 text-sm text-gray-500">Upload hóa đơn đầu tiên để bắt đầu quy trình xác nhận.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((invoice) => {
            const amount = extractAmount(invoice.extractedData);
            const vendor = extractString(
              invoice.extractedData,
              ['merchantName', 'vendor', 'description', 'invoiceName'],
              'Hóa đơn chờ xử lý'
            );

            return (
              <div key={invoice.id} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="aspect-[4/3] bg-gray-50">
                  {imagePreviews[invoice.id] ? (
                    <img
                      src={imagePreviews[invoice.id]}
                      alt={vendor}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Đang tải ảnh hóa đơn...
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{vendor}</p>
                      <p className="text-xs text-gray-500">#{invoice.id.slice(-8)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3 text-sm">
                    <div>
                      <p className="text-gray-500">Tổng tiền</p>
                      <p className="font-semibold text-gray-900">{formatVND(amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ngày tải</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(invoice.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {invoice.transactionId && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      Đã liên kết giao dịch: {invoice.transactionId.slice(-8)}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="flex-1 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Xem & xác nhận
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(invoice.id)}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Kiểm tra hóa đơn</h2>
                <p className="text-sm text-gray-500">Rà soát ảnh, chỉnh metadata và xác nhận thành giao dịch.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                  {imagePreviews[selectedInvoice.id] ? (
                    <img
                      src={imagePreviews[selectedInvoice.id]}
                      alt="Invoice preview"
                      className="max-h-[520px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-400">
                      Đang tải ảnh hóa đơn...
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Lịch sử kiểm toán</p>
                  <div className="mt-3 space-y-2">
                    {(selectedInvoice.auditTrail ?? []).slice(-4).reverse().map((entry, index) => (
                      <div key={`${entry.timestamp}-${index}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <p className="font-medium text-gray-900">{entry.action}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleString('vi-VN')} • {entry.changedBy || 'system'}
                        </p>
                        {entry.note && <p className="mt-1 text-xs text-gray-600">{entry.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-gray-900">Thông tin xác nhận</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[selectedInvoice.status]}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-600">Ví nguồn</span>
                      <select
                        value={confirmForm.walletId}
                        disabled={selectedInvoice.status === 'PROCESSED'}
                        onChange={(event) => setConfirmForm((prev) => ({ ...prev, walletId: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="">Chọn ví</option>
                        {wallets.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.walletName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-gray-600">Danh mục</span>
                      <select
                        value={confirmForm.categoryId}
                        disabled={selectedInvoice.status === 'PROCESSED'}
                        onChange={(event) => setConfirmForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="">Chọn danh mục</option>
                        {(expenseCategories.length > 0 ? expenseCategories : categories).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm sm:col-span-2">
                      <span className="text-gray-600">Tên người bán</span>
                      <input
                        value={extractString(
                          (confirmForm.extractedData ?? {}) as Record<string, unknown>,
                          ['merchantName', 'merchant_name'],
                          ''
                        )}
                        disabled={selectedInvoice.status === 'PROCESSED'}
                        onChange={(event) => {
                          const merchantName = event.target.value;
                          setConfirmForm((prev) => ({
                            ...prev,
                            description: merchantName || prev.description,
                            extractedData: {
                              ...(prev.extractedData ?? {}),
                              merchantName,
                              merchant_name: merchantName,
                            },
                          }));
                        }}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        placeholder="VD: Bông Trà CN Phạm Viết Chánh"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-gray-600">Số tiền</span>
                      <input
                        type="number"
                        value={confirmForm.amount}
                        disabled={selectedInvoice.status === 'PROCESSED'}
                        onChange={(event) => setConfirmForm((prev) => ({ ...prev, amount: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        placeholder="VD: 250000"
                      />
                      <p className="text-xs text-emerald-700">{formatVND(Number(confirmForm.amount || 0))}</p>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-gray-600">Ngày giao dịch</span>
                      <input
                        type="datetime-local"
                        value={confirmForm.occurredAt}
                        disabled={selectedInvoice.status === 'PROCESSED'}
                        onChange={(event) => setConfirmForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block space-y-1 text-sm">
                    <span className="text-gray-600">Mô tả</span>
                    <textarea
                      value={confirmForm.description}
                      disabled={selectedInvoice.status === 'PROCESSED'}
                      onChange={(event) => setConfirmForm((prev) => ({ ...prev, description: event.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-emerald-900">Kết quả AI nhận diện</p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Dữ liệu đã được điền sẵn theo luồng Google Vision + Gemini và bạn có thể chỉnh sửa trước khi lưu.
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      Vision + Gemini
                    </span>
                  </div>
                </div>

                {selectedInvoice.status === 'PROCESSED' ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                    Hóa đơn này đã được chốt thành giao dịch bất biến và không thể chỉnh sửa thêm.
                  </div>
                ) : selectedInvoice.status === 'REJECTED' ? (
                  <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                    Hóa đơn đã bị từ chối. Bạn vẫn có thể rà soát lại trước khi xác nhận giao dịch.
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  {selectedInvoice.status !== 'PROCESSED' && (
                    <button
                      type="button"
                      onClick={() => void handleReject()}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Từ chối
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    disabled={selectedInvoice.status === 'PROCESSED' || confirming}
                    onClick={() => void handleConfirm()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Xác nhận & Lưu giao dịch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
