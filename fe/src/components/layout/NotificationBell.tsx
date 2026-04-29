import { memo, useMemo, useState } from 'react';
import { Bell, BellRing, CircleAlert, Info, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const alertClasses: Record<string, string> = {
  ALERT: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/60',
  REMINDER: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60',
  INFO: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60',
  WARNING: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900/60',
};

function formatRelativeTime(value: string): string {
  const source = new Date(value);
  if (Number.isNaN(source.getTime())) {
    return '';
  }

  const seconds = Math.max(0, Math.floor((Date.now() - source.getTime()) / 1000));
  if (seconds < 60) return 'Vua xong';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phut truoc`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} gio truoc`;

  const days = Math.floor(hours / 24);
  return `${days} ngay truoc`;
}

export const NotificationBell = memo(function NotificationBell() {
  const [open, setOpen] = useState(false);
  const {
    data,
    isLoading,
    isError,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isMarkingAll,
  } = useNotifications({ page: 1, limit: 20, enabled: true });

  const notifications = useMemo(() => data?.data ?? [], [data]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="Mở trung tâm thông báo"
      >
        {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-semibold text-white dark:border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button className="fixed inset-0 z-50" onClick={() => setOpen(false)} aria-label="Đóng thông báo" />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 z-[60] mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Trung tâm thông báo</h3>
                <button
                  type="button"
                  disabled={isMarkingAll || unreadCount === 0}
                  onClick={() => void markAllAsRead()}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:text-gray-400 dark:text-emerald-300 dark:hover:text-emerald-200 dark:disabled:text-slate-500"
                >
                  {isMarkingAll ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {isLoading && (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
                    ))}
                  </div>
                )}

                {!isLoading && isError && (
                  <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Không thể tải thông báo. Vui lòng thử lại sau.
                  </div>
                )}

                {!isLoading && !isError && notifications.length === 0 && (
                  <div className="p-8 text-center">
                    <Info className="mx-auto mb-2 h-5 w-5 text-gray-400 dark:text-slate-400" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">Hiện chưa có thông báo mới.</p>
                  </div>
                )}

                {!isLoading && !isError && notifications.map((item) => {
                  const typeClass = alertClasses[item.type] ?? alertClasses.INFO;
                  const createdAt = item.created_at ? formatRelativeTime(item.created_at) : '';

                  return (
                    <button
                      type="button"
                      key={item._id}
                      onClick={() => {
                        if (!item.is_read) {
                          void markAsRead(item._id);
                        }
                      }}
                      className={cn(
                        'w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/70',
                        !item.is_read && 'bg-emerald-50/40 dark:bg-emerald-950/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('mt-0.5 p-1.5 rounded-lg border', typeClass)}>
                          <CircleAlert className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-sm font-medium',
                              item.type === 'ALERT'
                                ? 'text-orange-700 dark:text-orange-300'
                                : item.type === 'SUCCESS'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : item.type === 'WARNING'
                                ? 'text-yellow-700 dark:text-yellow-300'
                                : 'text-gray-900 dark:text-slate-100'
                            )}>
                              {item.title}
                            </p>
                            {!item.is_read && <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-slate-300">{item.message}</p>
                          <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">{createdAt}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 border-t border-gray-100 bg-gray-50/70 px-4 py-2 text-[11px] text-gray-400 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-500">
                <Loader2 className="w-3 h-3" />
                Tự làm mới qua SSE realtime, polling giữ vai trò dự phòng.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
