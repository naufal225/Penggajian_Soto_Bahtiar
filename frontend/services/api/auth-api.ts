import type { ApiSuccessResponse } from '@/types/api';

import { postJson } from '@/services/api/http-client';

export interface LoginApiRequest {
  email: string;
  password: string;
  device_name: string;
}

export interface LoginApiData {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export async function login(payload: LoginApiRequest): Promise<LoginApiData> {
  const response = await postJson<ApiSuccessResponse<LoginApiData>, LoginApiRequest>(
    '/auth/login',
    payload
  );

  return response.data;
}
