import type { ApiSuccessResponse } from '@/types/api';
import type {
  DailyWageByDateResponse,
  DailyWagePayload,
  DailyWageResponse,
  PaginationMeta,
  DailyWageUpdatePayload,
  PayAllPayload,
  PayAllResponse,
  PayEmployeePayload,
  PayEmployeeResponse,
  SyncPushChange,
  SyncPushResponse,
  WeekPeriodCurrentResponse,
  WeekPeriodDetailResponse,
  WeekPeriodListItem,
  WeeklyPaymentHistoryCard,
  WeeklyPaymentHistoryItem,
  WeeklyPaymentUndoResponse,
  WeeklySummaryPdfResponse,
} from '@/types/wage';

import { getJson, postJson, putJson } from '@/services/api/http-client';

interface PaginatedItemsResponse<TItem> {
  items: TItem[];
  meta: PaginationMeta;
}

function normalizeMeta(meta: unknown, perPage = 20): PaginationMeta {
  const defaultMeta: PaginationMeta = {
    current_page: 1,
    per_page: perPage,
    total: 0,
    last_page: 1,
  };

  if (!meta || typeof meta !== 'object') {
    return defaultMeta;
  }

  const rawMeta = meta as Partial<PaginationMeta>;

  return {
    current_page: rawMeta.current_page ?? defaultMeta.current_page,
    per_page: rawMeta.per_page ?? defaultMeta.per_page,
    total: rawMeta.total ?? defaultMeta.total,
    last_page: rawMeta.last_page ?? defaultMeta.last_page,
  };
}

export async function getDailyWagesByDate(date: string): Promise<DailyWageByDateResponse> {
  const response = await getJson<ApiSuccessResponse<DailyWageByDateResponse>>('/daily-wages', {
    requiresAuth: true,
    query: {
      date,
    },
  });

  return response.data;
}

export async function createDailyWage(payload: DailyWagePayload): Promise<DailyWageResponse> {
  const response = await postJson<ApiSuccessResponse<DailyWageResponse>, DailyWagePayload>('/daily-wages', payload, {
    requiresAuth: true,
  });

  return response.data;
}

export async function updateDailyWage(dailyWageId: number, payload: DailyWageUpdatePayload): Promise<DailyWageResponse> {
  const response = await putJson<ApiSuccessResponse<DailyWageResponse>, DailyWageUpdatePayload>(
    `/daily-wages/${dailyWageId}`,
    payload,
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function getCurrentWeekPeriod(): Promise<WeekPeriodCurrentResponse> {
  const response = await getJson<ApiSuccessResponse<WeekPeriodCurrentResponse>>('/week-periods/current', {
    requiresAuth: true,
  });

  return response.data;
}

export async function getWeekPeriodDetail(weekPeriodId: number): Promise<WeekPeriodDetailResponse> {
  const response = await getJson<ApiSuccessResponse<WeekPeriodDetailResponse>>(`/week-periods/${weekPeriodId}`, {
    requiresAuth: true,
  });

  return response.data;
}

export async function getWeekPeriodList(page = 1, perPage = 12): Promise<PaginatedItemsResponse<WeekPeriodListItem>> {
  const response = await getJson<ApiSuccessResponse<WeekPeriodListItem[]>>('/week-periods', {
    requiresAuth: true,
    query: {
      page,
      per_page: perPage,
    },
  });

  return {
    items: response.data,
    meta: normalizeMeta(response.meta, perPage),
  };
}

export async function payWeeklyEmployee(payload: PayEmployeePayload): Promise<PayEmployeeResponse> {
  const response = await postJson<ApiSuccessResponse<PayEmployeeResponse>, PayEmployeePayload>(
    '/weekly-payments/employee',
    payload,
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function payWeeklyAll(payload: PayAllPayload): Promise<PayAllResponse> {
  const response = await postJson<ApiSuccessResponse<PayAllResponse>, PayAllPayload>('/weekly-payments/all', payload, {
    requiresAuth: true,
  });

  return response.data;
}

export async function getWeeklySummaryPdf(weekPeriodId: number): Promise<WeeklySummaryPdfResponse> {
  const response = await getJson<ApiSuccessResponse<WeeklySummaryPdfResponse>>('/reports/weekly-summary-pdf', {
    requiresAuth: true,
    query: {
      week_period_id: weekPeriodId,
    },
  });

  return response.data;
}

export async function getWeeklyPayments(weekPeriodId: number): Promise<WeeklyPaymentHistoryItem[]> {
  const response = await getJson<ApiSuccessResponse<WeeklyPaymentHistoryItem[]>>('/weekly-payments', {
    requiresAuth: true,
    query: {
      week_period_id: weekPeriodId,
      page: 1,
      per_page: 50,
    },
  });

  return response.data;
}

export async function getWeeklyPaymentHistoryCards(
  weekPeriodId: number,
  page = 1,
  perPage = 20
): Promise<PaginatedItemsResponse<WeeklyPaymentHistoryCard>> {
  const response = await getJson<ApiSuccessResponse<WeeklyPaymentHistoryCard[]>>('/weekly-payments/history-cards', {
    requiresAuth: true,
    query: {
      week_period_id: weekPeriodId,
      page,
      per_page: perPage,
    },
  });

  return {
    items: response.data,
    meta: normalizeMeta(response.meta, perPage),
  };
}

export async function undoWeeklyPayment(paymentId: number, reason: string | null): Promise<WeeklyPaymentUndoResponse> {
  const response = await postJson<ApiSuccessResponse<WeeklyPaymentUndoResponse>, { reason: string | null }>(
    `/weekly-payments/${paymentId}/undo`,
    { reason },
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function pushSyncChanges(deviceId: string, changes: SyncPushChange[]): Promise<SyncPushResponse> {
  const response = await postJson<
    ApiSuccessResponse<SyncPushResponse>,
    { device_id: string; changes: SyncPushChange[] }
  >(
    '/sync/push',
    {
      device_id: deviceId,
      changes,
    },
    {
      requiresAuth: true,
    }
  );

  return response.data;
}
