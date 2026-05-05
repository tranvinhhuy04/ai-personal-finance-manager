import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Bot, ChevronDown, ChevronUp, Globe, KeyRound, Moon, Pencil, Plus, Shield, Smartphone, SunMedium, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { cn } from '@/lib/utils';
import { axiosClient } from '@/utils/axiosClient';

function SettingRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-gray-50/60 dark:hover:bg-slate-800/60">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

type AIUsageLog = {
  date: string;
  model: string;
  tokens_used: number;
  estimated_cost: number;
  api_key?: string;
};

type GeminiApiKeyEntry = {
  key_masked: string | null;
  status: 'active' | 'exhausted';
  added_at: string | null;
};

type SettingsApiResponse = {
  // New pool format
  gemini_api_keys?: GeminiApiKeyEntry[];
  has_gemini_api_key: boolean;
  // Legacy compat
  gemini_api_key_masked: string | null;
  selected_ai_model: string;
  available_models: string[];
  ai_usage_logs: AIUsageLog[];
};

type ProviderStatusResponse = {
  success: boolean;
  enabled?: boolean;
  key_present?: boolean;
  model?: string;
  status?: string;
  message?: string;
  http_status?: number | null;
  selected_ai_model?: string | null;
  has_gemini_api_key?: boolean;
  source?: string;
};

function inferTaskType(model: string) {
  return model.toLowerCase().includes('chat') ? 'Chat' : 'Text';
}

export const Settings = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  // Key pool state
  const [apiKeys, setApiKeys] = useState<GeminiApiKeyEntry[]>([]);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showAllKeys, setShowAllKeys] = useState(false);
  // Model & misc
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [availableModels, setAvailableModels] = useState<string[]>(['gemini-2.0-flash']);
  const [aiUsageLogs, setAiUsageLogs] = useState<AIUsageLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usagePage, setUsagePage] = useState(0);
  const USAGE_PAGE_SIZE = 5;
  const [isEditingModel, setIsEditingModel] = useState(false);

  const sortedUsageLogs = useMemo(() => {
    return [...aiUsageLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [aiUsageLogs]);

  const currentModel = providerStatus?.model || selectedModel || sortedUsageLogs[0]?.model || 'gemini-2.0-flash';
  const activeKeyCount = apiKeys.filter((k) => k.status === 'active').length;
  const canAddMore = apiKeys.length < 10;

  const providerStatusLabel = useMemo(() => {
    const status = providerStatus?.status;
    if (status === 'ok') return { text: 'Hoạt động bình thường', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
    if (status === 'quota_exceeded') return { text: 'Hết quota / rate limit', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
    if (status === 'invalid_key') return { text: 'API Key không hợp lệ', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };
    if (status === 'disabled') return { text: 'Chưa cấu hình API Key', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    if (status === 'network_error') return { text: 'Lỗi kết nối provider', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' };
    return { text: 'Chưa xác định', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  }, [providerStatus?.status]);

  async function fetchProviderStatus() {
    setProviderLoading(true);
    try {
      const response = await axiosClient.get<ProviderStatusResponse>('/api/v1/ai/provider-status');
      setProviderStatus(response.data ?? null);
    } catch (error: any) {
      setProviderStatus({
        success: false,
        status: 'network_error',
        message: error?.message || 'Không thể kiểm tra trạng thái runtime của Gemini.',
      });
    } finally {
      setProviderLoading(false);
    }
  }

  async function fetchSettings() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axiosClient.get<SettingsApiResponse>('/api/v1/settings');
      const payload = response.data;
      // Populate key pool (new format) or fall back to legacy single key
      if (Array.isArray(payload?.gemini_api_keys)) {
        setApiKeys(payload.gemini_api_keys);
      } else if (payload?.gemini_api_key_masked) {
        setApiKeys([{ key_masked: payload.gemini_api_key_masked, status: 'active', added_at: null }]);
      } else {
        setApiKeys([]);
      }
      setSelectedModel(payload?.selected_ai_model ?? 'gemini-2.0-flash');
      setAvailableModels(
        Array.isArray(payload?.available_models) && payload.available_models.length > 0
          ? payload.available_models
          : ['gemini-2.0-flash']
      );
      setAiUsageLogs(Array.isArray(payload?.ai_usage_logs) ? payload.ai_usage_logs : []);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Không thể tải dữ liệu cài đặt AI.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddKey() {
    const trimmed = newKeyInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập API Key trước khi thêm.');
      return;
    }
    if (apiKeys.length >= 10) {
      setErrorMessage('Đã đạt giới hạn 10 API Keys.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await axiosClient.post<SettingsApiResponse>('/api/v1/settings/api-keys', {
        gemini_api_key: trimmed,
      });
      if (Array.isArray(response.data?.gemini_api_keys)) {
        setApiKeys(response.data.gemini_api_keys);
      }
      setNewKeyInput('');
      setIsAddingKey(false);
      setSuccessMessage('Đã thêm API Key thành công.');
      void fetchProviderStatus();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Thêm API Key thất bại.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteKey(index: number) {
    setDeletingIndex(index);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await axiosClient.delete<SettingsApiResponse>(`/api/v1/settings/api-keys/${index}`);
      if (Array.isArray(response.data?.gemini_api_keys)) {
        setApiKeys(response.data.gemini_api_keys);
      }
      setSuccessMessage('Đã xóa API Key.');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Xóa API Key thất bại.');
    } finally {
      setDeletingIndex(null);
    }
  }

  async function handleSaveModel() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await axiosClient.patch<SettingsApiResponse>('/api/v1/settings', {
        selected_ai_model: selectedModel,
      });
      setSelectedModel(response.data?.selected_ai_model ?? selectedModel);
      setAvailableModels(
        Array.isArray(response.data?.available_models) && response.data.available_models.length > 0
          ? response.data.available_models
          : ['gemini-2.0-flash']
      );
      setSuccessMessage('Đã lưu model AI.');
      setIsEditingModel(false);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Lưu model thất bại.');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void fetchSettings();
    void fetchProviderStatus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Cài đặt hệ thống</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Tùy chỉnh giao diện, thông báo và trải nghiệm sử dụng theo thói quen của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="max-w-3xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            <SettingRow
              icon={isDark ? Moon : SunMedium}
              title="Chế độ Sáng / Tối"
              description={`Giao diện hiện tại: ${theme === 'dark' ? 'Tối dịu mắt' : 'Sáng hiện đại'}. Trạng thái được lưu vào localStorage.`}
              action={
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  onClick={toggleTheme}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
                    isDark ? 'bg-emerald-500' : 'bg-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform',
                      isDark ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              }
            />

            <SettingRow
              icon={Globe}
              title="Ngôn ngữ"
              description="Tiếng Việt là ngôn ngữ mặc định cho dashboard và định dạng tài chính."
              action={<span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Tiếng Việt</span>}
            />

            <SettingRow
              icon={Bell}
              title="Thông báo đẩy"
              description="Nhận thông báo về giao dịch mới, đồng bộ dữ liệu và nhắc lịch quan trọng."
              action={<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Đang bật</span>}
            />

            <SettingRow
              icon={Smartphone}
              title="Thiết bị đã đăng nhập"
              description="Quản lý những thiết bị đang truy cập tài khoản để tăng tính an toàn."
              action={<button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">Quản lý</button>}
            />

            <div className="p-5">
              {/* ── Header ── */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white">Cấu hình AI – API Key Pool</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {activeKeyCount > 0
                      ? `${activeKeyCount} key đang hoạt động · ${apiKeys.length}/10 keys`
                      : 'Chưa có API Key nào được thêm'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsEditingModel((v) => !v); setErrorMessage(null); setSuccessMessage(null); }}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {isEditingModel ? <><ChevronUp className="h-4 w-4" /> Ẩn</> : <><Pencil className="h-4 w-4" /> Model</>}
                </button>
              </div>

              {/* ── Key Pool List ── */}
              {apiKeys.length > 0 && (
                <div className="mt-4 space-y-2">
                  {(showAllKeys ? apiKeys : apiKeys.slice(0, 3)).map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                            entry.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                          )}
                        >
                          {entry.status === 'active' ? 'Hoạt động' : 'Hết Quota'}
                        </span>
                        <span className="font-mono text-sm text-gray-700 dark:text-slate-200 truncate">
                          {entry.key_masked ?? '••••••••'}
                        </span>
                        {entry.added_at && (
                          <span className="hidden sm:block text-xs text-gray-400 dark:text-slate-500 shrink-0">
                            {new Date(entry.added_at).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={deletingIndex === idx}
                        onClick={() => void handleDeleteKey(idx)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingIndex === idx ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </div>
                  ))}
                  {apiKeys.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllKeys((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50/40 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      {showAllKeys ? (
                        <><ChevronUp className="h-3.5 w-3.5" /> Thu gọn</>
                      ) : (
                        <><ChevronDown className="h-3.5 w-3.5" /> Xem thêm {apiKeys.length - 3} key</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* ── Add new key inline form ── */}
              <AnimatePresence initial={false}>
                {isAddingKey && (
                  <motion.div
                    key="add-key-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex gap-2">
                      <input
                        type="password"
                        value={newKeyInput}
                        onChange={(e) => setNewKeyInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleAddKey(); }}
                        placeholder="Dán Gemini API Key vào đây..."
                        autoFocus
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                      />
                      <button
                        type="button"
                        onClick={() => void handleAddKey()}
                        disabled={isSaving}
                        className="shrink-0 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingKey(false); setNewKeyInput(''); setErrorMessage(null); }}
                        className="shrink-0 inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        Huỷ
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Add key button ── */}
              {!isAddingKey && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={!canAddMore}
                    onClick={() => { setIsAddingKey(true); setErrorMessage(null); setSuccessMessage(null); }}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  >
                    <Plus className="h-4 w-4" />
                    {canAddMore ? `Thêm Key mới (${apiKeys.length}/10)` : 'Đã đạt giới hạn 10 keys'}
                  </button>
                </div>
              )}

              {/* ── Model selector (collapsible) ── */}
              <AnimatePresence initial={false}>
                {isEditingModel && (
                  <motion.div
                    key="model-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-slate-800">
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                          Model Gemini
                        </label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                        >
                          {availableModels.map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleSaveModel()}
                          disabled={isSaving}
                          className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? 'Đang lưu...' : 'Lưu Model'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsEditingModel(false); setErrorMessage(null); setSuccessMessage(null); }}
                          className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {successMessage && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>}
              {errorMessage && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Quản lý Quota AI</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Model hiện tại: {currentModel}</p>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-slate-300">Tình trạng key runtime</p>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', providerStatusLabel.className)}>
                {providerLoading ? 'Đang kiểm tra...' : providerStatusLabel.text}
              </span>
            </div>

            {providerStatus?.message ? (
              <p className="mb-3 text-xs text-gray-500 dark:text-slate-400 line-clamp-3">{providerStatus.message}</p>
            ) : null}

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Trạng thái phía trên phản ánh kiểm tra runtime thật của key/model đang sử dụng để gọi AI.
              </p>
              <button
                type="button"
                onClick={() => void fetchProviderStatus()}
                disabled={providerLoading}
                className="ml-3 shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {providerLoading ? 'Đang kiểm tra...' : 'Thử lại'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Chi tiết sử dụng &amp; Chi phí</p>
              </div>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">Đang tải lịch sử sử dụng AI...</p>
            ) : sortedUsageLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">Chưa có lượt gọi AI nào cho API Key hiện tại.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="px-2 py-2">Thời gian</th>
                        <th className="px-2 py-2">API KEY</th>
                        <th className="px-2 py-2">Loại tác vụ</th>
                        <th className="px-2 py-2">Số lượng Token</th>
                        <th className="px-2 py-2">Chi phí ước tính</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsageLogs.slice(usagePage * USAGE_PAGE_SIZE, (usagePage + 1) * USAGE_PAGE_SIZE).map((log, index) => (
                        <tr key={`${log.date}-${index}`} className="border-b border-gray-50 text-gray-700 dark:border-slate-800 dark:text-slate-200">
                          <td className="px-2 py-2">{new Date(log.date).toLocaleString('vi-VN')}</td>
                          <td className="px-2 py-2 font-mono text-xs text-gray-500 dark:text-slate-400">
                            {log.api_key ?? apiKeys.find((k) => k.status === 'active')?.key_masked ?? '—'}
                          </td>
                          <td className="px-2 py-2">
                            <div className="font-medium">{inferTaskType(log.model)}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">{log.model}</div>
                          </td>
                          <td className="px-2 py-2">{Number(log.tokens_used).toLocaleString('vi-VN')}</td>
                          <td className="px-2 py-2">${Number(log.estimated_cost).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sortedUsageLogs.length > USAGE_PAGE_SIZE && (
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                    <span>
                      {usagePage * USAGE_PAGE_SIZE + 1}–{Math.min((usagePage + 1) * USAGE_PAGE_SIZE, sortedUsageLogs.length)} / {sortedUsageLogs.length} bản ghi
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={usagePage === 0}
                        onClick={() => setUsagePage((p) => p - 1)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        ‹ Trước
                      </button>
                      <button
                        type="button"
                        disabled={(usagePage + 1) * USAGE_PAGE_SIZE >= sortedUsageLogs.length}
                        onClick={() => setUsagePage((p) => p + 1)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        Sau ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
