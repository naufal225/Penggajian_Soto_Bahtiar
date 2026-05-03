import type { DashboardSummary } from '@/types/dashboard';
import type { DailyWageByDateResponse, WeekPeriodDetailResponse } from '@/types/wage';

export interface CachedDashboardSnapshot {
  summary: DashboardSummary;
  cachedAt: string;
}

export interface CachedWageSnapshot {
  data: DailyWageByDateResponse;
  weekDetail: WeekPeriodDetailResponse;
  cachedAt: string | null;
}

export interface SyncOverview {
  pendingSyncCount: number;
  lastServerSyncAt: string | null;
  lastWageDate: string | null;
}
