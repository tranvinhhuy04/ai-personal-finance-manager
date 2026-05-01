import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Bot, Globe, KeyRound, Moon, Shield, Smartphone, SunMedium } from 'lucide-react';
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
};

type SettingsApiResponse = {
  gemini_api_key_masked: string | null;
  has_gemini_api_key: boolean;
  selected_ai_model: string;
  available_models: string[];
  ai_usage_logs: AIUsageLog[];
};

const QUOTA_TOKEN_LIMIT = 500_000;

function inferTaskType(model: string) {
  return model.toLowerCase().includes('chat') ? 'Chat' : 'Text';
}

export const Settings = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>(['gemini-2.5-flash']);
  const [aiUsageLogs, setAiUsageLogs] = useState<AIUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedUsageLogs = useMemo(() => {
    return [...aiUsageLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [aiUsageLogs]);

  const totalTokensUsed = useMemo(
    () => sortedUsageLogs.reduce((sum, item) => sum + Number(item.tokens_used || 0), 0),
    [sortedUsageLogs]
  );

  const quotaUsedPercent = Math.min(100, Math.round((totalTokensUsed / QUOTA_TOKEN_LIMIT) * 100));
  const currentModel = selectedModel || sortedUsageLogs[0]?.model || 'gemini-2.5-flash';

  async function fetchSettings() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axiosClient.get<SettingsApiResponse>('/api/v1/settings');
      const payload = response.data;
      setApiKeyMasked(payload?.gemini_api_key_masked ?? null);
      setSelectedModel(payload?.selected_ai_model ?? 'gemini-2.5-flash');
      setAvailableModels(
        Array.isArray(payload?.available_models) && payload.available_models.length > 0
          ? payload.available_models
          : ['gemini-2.5-flash']
      );
      setAiUsageLogs(Array.isArray(payload?.ai_usage_logs) ? payload.ai_usage_logs : []);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Không thể tải dữ liệu cài đặt AI.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveGeminiKey() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!apiKeyInput.trim() && !selectedModel.trim()) {
        setErrorMessage('Vui lòng nhập API Key hoặc chọn model trước khi lưu.');
        setSuccessMessage(null);
        setIsSaving(false);
        return;
      }

      const response = await axiosClient.patch<SettingsApiResponse>('/api/v1/settings', {
        gemini_api_key: apiKeyInput.trim() || undefined,
        selected_ai_model: selectedModel,
      });
      setApiKeyMasked(response.data?.gemini_api_key_masked ?? null);
      setSelectedModel(response.data?.selected_ai_model ?? selectedModel);
      setAvailableModels(
        Array.isArray(response.data?.available_models) && response.data.available_models.length > 0
          ? response.data.available_models
          : ['gemini-2.5-flash']
      );
      setAiUsageLogs(Array.isArray(response.data?.ai_usage_logs) ? response.data.ai_usage_logs : []);
      setApiKeyInput('');
      setSuccessMessage('Đã lưu cấu hình AI thành công.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Lưu API Key thất bại.');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void fetchSettings();
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
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Cấu hình AI</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Cập nhật Gemini API Key để kích hoạt các tính năng AI cá nhân hóa.</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder="Nhập Gemini API Key mới"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                />

                {apiKeyMasked && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    API Key hiện tại: <span className="font-semibold text-gray-700 dark:text-slate-200">{apiKeyMasked}</span>
                  </p>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Model Gemini khả dụng
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveGeminiKey}
                  disabled={isSaving}
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>

                {successMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>}
                {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
              </div>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-300">
                <span>Đã dùng {quotaUsedPercent}%</span>
                <span>
                  {totalTokensUsed.toLocaleString('vi-VN')} / {QUOTA_TOKEN_LIMIT.toLocaleString('vi-VN')} token
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                <div
                  className="h-2.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${quotaUsedPercent}%` }}
                />
              </div>
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-2 py-2">Thời gian</th>
                      <th className="px-2 py-2">Loại tác vụ</th>
                      <th className="px-2 py-2">Số lượng Token</th>
                      <th className="px-2 py-2">Chi phí ước tính</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsageLogs.map((log, index) => (
                      <tr key={`${log.date}-${index}`} className="border-b border-gray-50 text-gray-700 dark:border-slate-800 dark:text-slate-200">
                        <td className="px-2 py-2">{new Date(log.date).toLocaleString('vi-VN')}</td>
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
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
