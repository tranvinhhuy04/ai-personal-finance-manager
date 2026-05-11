import { apiClient } from '@/lib/apiClient';
import type { AnalyticsDashboardResponse } from '@/types/finance';

export function getAnalyticsDashboard(params?: {
  month?: string;
  walletId?: string;
  type?: 'monthly' | 'yearly';
}): Promise<AnalyticsDashboardResponse> {
  return apiClient.getAnalyticsDashboard(params);
}
