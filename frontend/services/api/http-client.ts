import type { ApiErrorResponse } from '@/types/api';
import { getAuthToken } from '@/services/storage/session-storage';

const REQUEST_TIMEOUT_MS = 10000;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<TBody extends object | undefined> {
  endpoint: string;
  method: HttpMethod;
  body?: TBody;
  query?: Record<string, string | number | null | undefined>;
  requiresAuth?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number | null = null,
    public readonly fields: Record<string, string[]> | null = null
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function getBaseUrl(): string {
  const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!rawBaseUrl) {
    throw new ApiClientError('Alamat server belum diatur', 'BASE_URL_NOT_CONFIGURED');
  }

  return rawBaseUrl.replace(/\/+$/, '');
}

function extractApiError(payload: unknown): ApiErrorResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (!('success' in payload) || !('message' in payload) || !('error' in payload)) {
    return null;
  }

  const maybeError = payload as Partial<ApiErrorResponse>;

  if (maybeError.success !== false || typeof maybeError.message !== 'string' || !maybeError.error) {
    return null;
  }

  return maybeError as ApiErrorResponse;
}

function buildQueryString(query?: Record<string, string | number | null | undefined>): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function buildHeaders(body: object | undefined, requiresAuth: boolean): Promise<HeadersInit> {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    const token = await getAuthToken();

    if (!token) {
      throw new ApiClientError('Sesi login berakhir', 'UNAUTHORIZED', 401);
    }

    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function requestJson<TResponse, TBody extends object | undefined>({
  endpoint,
  method,
  body,
  query,
  requiresAuth = false,
}: RequestOptions<TBody>): Promise<TResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}${buildQueryString(query)}`;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = await buildHeaders(body, requiresAuth);

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: abortController.signal,
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const apiError = extractApiError(payload);

      if (apiError) {
        throw new ApiClientError(
          apiError.message,
          apiError.error.code,
          response.status,
          apiError.error.fields
        );
      }

      if (response.status === 401) {
        throw new ApiClientError('Sesi login berakhir', 'UNAUTHORIZED', 401);
      }

      throw new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR', response.status);
    }

    return payload as TResponse;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Tidak bisa terhubung ke server', 'REQUEST_TIMEOUT');
    }

    throw new ApiClientError('Tidak bisa terhubung ke server', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RequestExtraOptions {
  query?: Record<string, string | number | null | undefined>;
  requiresAuth?: boolean;
}

export async function getJson<TResponse>(
  endpoint: string,
  options?: RequestExtraOptions
): Promise<TResponse> {
  return requestJson<TResponse, undefined>({
    endpoint,
    method: 'GET',
    query: options?.query,
    requiresAuth: options?.requiresAuth,
  });
}

export async function postJson<TResponse, TBody extends object>(
  endpoint: string,
  body: TBody,
  options?: RequestExtraOptions
): Promise<TResponse> {
  return requestJson<TResponse, TBody>({
    endpoint,
    method: 'POST',
    body,
    query: options?.query,
    requiresAuth: options?.requiresAuth,
  });
}

export async function putJson<TResponse, TBody extends object>(
  endpoint: string,
  body: TBody,
  options?: RequestExtraOptions
): Promise<TResponse> {
  return requestJson<TResponse, TBody>({
    endpoint,
    method: 'PUT',
    body,
    query: options?.query,
    requiresAuth: options?.requiresAuth,
  });
}

export async function patchJson<TResponse, TBody extends object | undefined>(
  endpoint: string,
  body?: TBody,
  options?: RequestExtraOptions
): Promise<TResponse> {
  return requestJson<TResponse, TBody>({
    endpoint,
    method: 'PATCH',
    body,
    query: options?.query,
    requiresAuth: options?.requiresAuth,
  });
}

export async function deleteJson<TResponse>(
  endpoint: string,
  options?: RequestExtraOptions
): Promise<TResponse> {
  return requestJson<TResponse, undefined>({
    endpoint,
    method: 'DELETE',
    query: options?.query,
    requiresAuth: options?.requiresAuth,
  });
}
