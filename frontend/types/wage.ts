export interface DailyWageItem {
  id: number;
  amount: number;
  notes: string | null;
  is_paid: boolean;
  is_locked: boolean;
  wage_date: string;
  updated_at: string;
}

export interface DailyWageByDateEmployee {
  employee_id: number;
  employee_name: string;
  daily_wage: DailyWageItem | null;
}

export interface DailyWageByDateWeekInfo {
  id: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'partial_paid' | 'fully_paid';
  is_locked: boolean;
}

export interface DailyWageByDateResponse {
  date: string;
  week_period: DailyWageByDateWeekInfo;
  employees: DailyWageByDateEmployee[];
}

export interface DailyWagePayload {
  employee_id: number;
  wage_date: string;
  amount: number;
  notes: string | null;
}

export interface DailyWageUpdatePayload {
  amount: number;
  notes: string | null;
}

export interface DailyWageResponse {
  id: number;
  employee_id: number;
  employee_name: string;
  week_period_id: number;
  wage_date: string;
  amount: number;
  notes: string | null;
  is_paid: boolean;
  is_locked: boolean;
  paid_at: string | null;
  client_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekPeriodSummary {
  employee_count: number;
  filled_wage_count: number;
  total_amount: number;
  paid_employee_count: number;
  unpaid_employee_count: number;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface WeekPeriodCurrentResponse {
  id: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'partial_paid' | 'fully_paid';
  is_locked: boolean;
  locked_at: string | null;
  summary: WeekPeriodSummary;
}

export type WeekPeriodListItem = WeekPeriodCurrentResponse;

export interface WeekDetailEmployeeStatus {
  employee_id: number;
  employee_name: string;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  filled_days: number;
  unpaid_days: number;
  can_pay_now: boolean;
  payment_status: 'paid' | 'unpaid';
  paid_at: string | null;
  is_locked: boolean;
}

export interface WeekPeriodDetailResponse extends WeekPeriodCurrentResponse {
  employees: WeekDetailEmployeeStatus[];
}

export interface PayEmployeePayload {
  week_period_id: number;
  employee_id: number;
  notes?: string | null;
}

export interface PayEmployeeResponse {
  payment_id: number;
  week_period_id: number;
  employee_id: number;
  employee_name: string;
  payment_scope: 'employee';
  total_amount: number;
  paid_at: string;
  week_status_after_payment: 'open' | 'partial_paid' | 'fully_paid';
}

export interface PayAllPayload {
  week_period_id: number;
  notes?: string | null;
}

export interface PayAllResponse {
  payment_id: number;
  week_period_id: number;
  payment_scope: 'all';
  total_amount: number;
  paid_employee_count: number;
  paid_at: string;
  week_status_after_payment: 'open' | 'partial_paid' | 'fully_paid';
}

export interface WeeklySummaryPdfResponse {
  file_name: string;
  download_url: string;
  expires_at: string;
}

export type WageSyncState = 'pending' | 'synced' | 'failed' | 'conflict';

export interface WeeklyPaymentHistoryItem {
  id: number;
  week_period_id: number;
  employee_id: number | null;
  employee_name: string | null;
  payment_scope: 'employee' | 'all';
  total_amount: number;
  paid_at: string;
  notes: string | null;
}

export interface WeeklyPaymentHistoryCard {
  history_item_id: string;
  payment_id: number;
  week_period_id: number;
  employee_id: number;
  employee_name: string | null;
  payment_scope: 'employee' | 'all';
  total_amount: number;
  paid_at: string;
  notes: string | null;
  can_undo: boolean;
}

export interface WeeklyPaymentUndoResponse {
  payment_id: number;
  week_period_id: number;
  status: 'undone';
  week_status_after_undo: 'open' | 'partial_paid' | 'fully_paid';
}

export interface SyncPushChange {
  entity: 'daily_wage' | 'weekly_payment';
  action: 'create' | 'update' | 'pay_employee' | 'pay_all' | 'undo';
  client_uuid?: string | null;
  server_id?: number | null;
  payload: Record<string, unknown>;
}

export interface SyncPushResultItem {
  client_uuid: string | null;
  server_id: number | null;
  status: 'success' | 'failed' | 'conflict';
  entity: 'daily_wage' | 'weekly_payment';
  action: 'create' | 'update' | 'pay_employee' | 'pay_all' | 'undo';
  error: {
    code: string;
    message: string;
  } | null;
}

export interface SyncPushResponse {
  processed: number;
  results: SyncPushResultItem[];
}
