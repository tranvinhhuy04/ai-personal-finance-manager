import { useMemo } from 'react';
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
  type: 'ALERT' | 'INFO' | 'REMINDER';
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
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

  const query = useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: () => fetchNotifications(page, limit),
    staleTime: 20 * 1000,
    enabled,
    refetchInterval: enabled ? 15000 : false,
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
      await Promise.all(unreadIds.map((id) => markRead(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

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
