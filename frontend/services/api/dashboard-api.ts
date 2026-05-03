import type { ApiSuccessResponse } from '@/types/api';
import type { DashboardSummary } from '@/types/dashboard';

import { getJson } from '@/services/api/http-client';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await getJson<ApiSuccessResponse<DashboardSummary>>('/dashboard', {
    requiresAuth: true,
  });

  return response.data;
}
