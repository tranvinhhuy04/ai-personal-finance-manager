import { useEffect, useMemo, useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { axiosClient } from '@/utils/axiosClient';

export interface NotificationItem {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'REMINDER' | 'SUCCESS' | 'WARNING';
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

function readPersistedAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (directToken) {
    return directToken;
  }

  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) {
    return null;
  }

  try {
    const parsed = JSON.parse(authStorage) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

interface NotificationListResponse {
  data: NotificationItem[];
  paging: {
    page: number;
    limit: number;
    total: number;
  };
}

interface NotificationParams {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

async function fetchNotifications(page: number, limit: number): Promise<NotificationListResponse> {
  const response = await axiosClient.get<NotificationListResponse>('/api/v1/notifications', {
    params: { page, limit },
  });
  return response.data;
}

async function markRead(notificationId: string) {
  await axiosClient.put(`/api/v1/notifications/${notificationId}/read`);
}

export function useNotifications(params?: NotificationParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const enabled = params?.enabled ?? true;

  const queryClient = useQueryClient();
  const invalidateTimeoutRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: () => fetchNotifications(page, limit),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: enabled ? 2 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const currentItems = query.data?.data ?? [];
      const unreadIds = currentItems.filter((item) => !item.is_read).map((item) => item._id);

      for (const id of unreadIds) {
        await markRead(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    const token = readPersistedAuthToken();
    if (!token) {
      return;
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
    const eventSource = new EventSource(`${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`);

    const scheduleInvalidate = () => {
      if (invalidateTimeoutRef.current !== null) {
        return;
      }

      invalidateTimeoutRef.current = window.setTimeout(() => {
        invalidateTimeoutRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }, 750);
    };

    eventSource.onmessage = scheduleInvalidate;

    eventSource.onerror = () => {
      // Browser will retry automatically; the slow polling fallback above is enough here.
    };

    return () => {
      if (invalidateTimeoutRef.current !== null) {
        window.clearTimeout(invalidateTimeoutRef.current);
        invalidateTimeoutRef.current = null;
      }

      eventSource.close();
    };
  }, [enabled, queryClient]);

  const unreadCount = useMemo(() => {
    const list = query.data?.data ?? [];
    return list.filter((item) => !item.is_read).length;
  }, [query.data]);

  return {
    ...query,
    unreadCount,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAll: markAllAsReadMutation.isPending,
  };
}
