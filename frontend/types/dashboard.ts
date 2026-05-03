export interface DashboardCurrentWeek {
  id: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'partial_paid' | 'fully_paid';
  is_locked: boolean;
  total_amount: number;
  paid_employee_count: number;
  unpaid_employee_count: number;
}

export interface DashboardSyncInfo {
  server_time: string;
  recommended_pull_after: boolean;
}

export interface DashboardQuickActions {
  can_input_today_wage: boolean;
  can_process_payment: boolean;
  can_export_current_week_pdf: boolean;
}

export interface DashboardSummary {
  today_date: string;
  owner_name: string;
  today_total_amount: number;
  active_employee_count: number;
  today_filled_count: number;
  today_unfilled_count: number;
  current_week: DashboardCurrentWeek;
  sync_info: DashboardSyncInfo;
  quick_actions: DashboardQuickActions;
}
