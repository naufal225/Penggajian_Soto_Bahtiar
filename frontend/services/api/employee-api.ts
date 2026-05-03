import type { ApiSuccessResponse } from '@/types/api';
import type {
  EmployeeDeleteResponse,
  EmployeeItem,
  EmployeeListMeta,
  EmployeeListQuery,
  EmployeePayload,
} from '@/types/employee';

import { deleteJson, getJson, patchJson, postJson, putJson } from '@/services/api/http-client';

interface EmployeeListResponse {
  items: EmployeeItem[];
  meta: EmployeeListMeta;
}

interface EmployeeActivationResponse {
  id: number;
  is_active: boolean;
}

function normalizeMeta(meta: unknown): EmployeeListMeta {
  const defaultMeta: EmployeeListMeta = {
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
  };

  if (!meta || typeof meta !== 'object') {
    return defaultMeta;
  }

  const rawMeta = meta as Partial<EmployeeListMeta>;

  return {
    current_page: rawMeta.current_page ?? defaultMeta.current_page,
    per_page: rawMeta.per_page ?? defaultMeta.per_page,
    total: rawMeta.total ?? defaultMeta.total,
    last_page: rawMeta.last_page ?? defaultMeta.last_page,
  };
}

export async function getEmployeeList(query: EmployeeListQuery): Promise<EmployeeListResponse> {
  const response = await getJson<ApiSuccessResponse<EmployeeItem[]>>('/employees', {
    requiresAuth: true,
    query: {
      status: query.status,
      page: query.page,
      per_page: query.per_page,
      search: query.search,
    },
  });

  return {
    items: response.data,
    meta: normalizeMeta(response.meta),
  };
}

export async function createEmployee(payload: EmployeePayload): Promise<EmployeeItem> {
  const response = await postJson<ApiSuccessResponse<EmployeeItem>, EmployeePayload>(
    '/employees',
    payload,
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function getEmployeeDetail(employeeId: number): Promise<EmployeeItem> {
  const response = await getJson<ApiSuccessResponse<EmployeeItem>>(`/employees/${employeeId}`, {
    requiresAuth: true,
  });

  return response.data;
}

export async function updateEmployee(employeeId: number, payload: EmployeePayload): Promise<EmployeeItem> {
  const response = await putJson<ApiSuccessResponse<EmployeeItem>, EmployeePayload>(
    `/employees/${employeeId}`,
    payload,
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function deactivateEmployee(employeeId: number): Promise<EmployeeActivationResponse> {
  const response = await patchJson<ApiSuccessResponse<EmployeeActivationResponse>, undefined>(
    `/employees/${employeeId}/deactivate`,
    undefined,
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function activateEmployee(employeeId: number): Promise<EmployeeActivationResponse> {
  const response = await patchJson<ApiSuccessResponse<EmployeeActivationResponse>, undefined>(
    `/employees/${employeeId}/activate`,
    undefined,
    {
      requiresAuth: true,
    }
  );

  return response.data;
}

export async function deleteEmployee(employeeId: number): Promise<EmployeeDeleteResponse> {
  const response = await deleteJson<ApiSuccessResponse<EmployeeDeleteResponse>>(`/employees/${employeeId}`, {
    requiresAuth: true,
  });

  return response.data;
}
