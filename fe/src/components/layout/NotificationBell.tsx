import { memo, useMemo, useState } from 'react';
import { Bell, BellRing, CircleAlert, Info, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const alertClasses: Record<string, string> = {
  ALERT: 'bg-orange-50 text-orange-700 border-orange-200',
  REMINDER: 'bg-amber-50 text-amber-700 border-amber-200',
  INFO: 'bg-slate-50 text-slate-700 border-slate-200',
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
  } = useNotifications({ page: 1, limit: 20, enabled: open });

  const notifications = useMemo(() => data?.data ?? [], [data]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all border border-gray-200 bg-white relative"
        aria-label="Mở trung tâm thông báo"
      >
        {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[10px] text-white font-semibold flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-label="Đóng thông báo" />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Trung tâm thông báo</h3>
                <button
                  type="button"
                  disabled={isMarkingAll || unreadCount === 0}
                  onClick={() => void markAllAsRead()}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:text-gray-400"
                >
                  {isMarkingAll ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {isLoading && (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                )}

                {!isLoading && isError && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    Không thể tải thông báo. Vui lòng thử lại sau.
                  </div>
                )}

                {!isLoading && !isError && notifications.length === 0 && (
                  <div className="p-8 text-center">
                    <Info className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Hiện chưa có thông báo mới.</p>
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
                        'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                        !item.is_read && 'bg-emerald-50/40'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('mt-0.5 p-1.5 rounded-lg border', typeClass)}>
                          <CircleAlert className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm font-medium', item.type === 'ALERT' ? 'text-orange-700' : 'text-gray-900')}>
                              {item.title}
                            </p>
                            {!item.is_read && <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.message}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{createdAt}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-4 py-2 text-[11px] text-gray-400 bg-gray-50/70 border-t border-gray-100 flex items-center gap-1">
                <Loader2 className="w-3 h-3" />
                Cập nhật theo chu kỳ ngắn để giữ dữ liệu realtime.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
