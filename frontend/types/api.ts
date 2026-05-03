export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta: unknown;
}

export interface ApiErrorDetail {
  code: string;
  details: unknown;
  fields: Record<string, string[]> | null;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
