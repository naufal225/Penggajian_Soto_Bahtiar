export type EmployeeStatusFilter = 'active' | 'inactive' | 'all';

export interface EmployeeItem {
  id: number;
  name: string;
  phone_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface EmployeeListQuery {
  status?: EmployeeStatusFilter;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface EmployeePayload {
  name: string;
  phone_number: string | null;
  notes: string | null;
}

export interface EmployeeDeleteResponse {
  id: number;
  deleted_at: string;
}
