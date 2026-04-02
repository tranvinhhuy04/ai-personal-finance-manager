import React from 'react';
import { motion } from 'motion/react';
import { Bell, Globe, Moon, Shield, Smartphone, SunMedium } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { cn } from '@/lib/utils';

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

export const Settings = () => {
  const { theme, isDark, toggleTheme } = useTheme();

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
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {isDark ? <Moon className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Theme hiện tại</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-gray-500 dark:text-slate-400">
              Trong Dark Mode, hệ thống ưu tiên các tone như `dark:bg-slate-900`, `dark:bg-slate-800`, `dark:text-slate-200`,
              giúp dữ liệu tài chính rõ ràng hơn và tránh mỏi mắt.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Gợi ý UX cho Dark Mode</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
              <li>• Nền trang: `dark:bg-slate-900` hoặc `dark:bg-slate-950`.</li>
              <li>• Card dữ liệu: `dark:bg-slate-800` để tách lớp nhẹ nhàng.</li>
              <li>• Text thường: `dark:text-slate-200`, tiêu đề: `dark:text-white`.</li>
              <li>• Thu nhập / Chi tiêu: dùng `dark:text-green-400` và `dark:text-red-400` để giữ tương phản tốt.</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
