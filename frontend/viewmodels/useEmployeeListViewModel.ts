import { useCallback, useEffect, useMemo, useState } from 'react';

import { getEmployeeList } from '@/services/api/employee-api';
import { ApiClientError } from '@/services/api/http-client';
import { cacheEmployees, getCachedEmployees } from '@/services/sqlite/employee-cache';
import type { EmployeeItem, EmployeeListMeta, EmployeeStatusFilter } from '@/types/employee';

const EMPLOYEE_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 400;

interface UseEmployeeListViewModelOptions {
  onUnauthorized: () => void;
}

function normalizeClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  return new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
}

function mapGeneralErrorMessage(error: ApiClientError): string {
  if (error.code === 'EMPLOYEE_NOT_FOUND') {
    return 'Data karyawan tidak ditemukan';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Tidak bisa terhubung ke server';
  }

  if (error.code === 'VALIDATION_ERROR') {
    return 'Data pencarian tidak valid';
  }

  return 'Terjadi masalah, coba lagi';
}

function isNetworkFailure(errorCode: string): boolean {
  return errorCode === 'NETWORK_ERROR' || errorCode === 'REQUEST_TIMEOUT';
}

export function useEmployeeListViewModel({ onUnauthorized }: UseEmployeeListViewModelOptions) {
  const [data, setData] = useState<EmployeeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>('active');
  const [meta, setMeta] = useState<EmployeeListMeta>({
    current_page: 1,
    per_page: EMPLOYEE_PER_PAGE,
    total: 0,
    last_page: 1,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const fetchEmployees = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'load_more') => {
      if (mode === 'initial') {
        setLoading(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await getEmployeeList({
          status: statusFilter,
          page,
          per_page: EMPLOYEE_PER_PAGE,
          search: debouncedSearch || undefined,
        });

        await cacheEmployees(response.items);

        setData((previousData) => (mode === 'load_more' ? [...previousData, ...response.items] : response.items));
        setMeta(response.meta);
        setError(null);
      } catch (rawError) {
        const errorObject = normalizeClientError(rawError);

        if (errorObject.code === 'UNAUTHORIZED') {
          onUnauthorized();
          return;
        }

        if (mode !== 'load_more' && isNetworkFailure(errorObject.code)) {
          const cachedItems = await getCachedEmployees(statusFilter, debouncedSearch);

          if (cachedItems.length > 0) {
            setData(cachedItems);
            setMeta({
              current_page: 1,
              per_page: cachedItems.length,
              total: cachedItems.length,
              last_page: 1,
            });
            setError('Menampilkan data tersimpan di HP');
            return;
          }
        }

        setError(mapGeneralErrorMessage(errorObject));

        if (mode !== 'load_more') {
          setData([]);
          setMeta({
            current_page: 1,
            per_page: EMPLOYEE_PER_PAGE,
            total: 0,
            last_page: 1,
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, onUnauthorized, statusFilter]
  );

  useEffect(() => {
    void fetchEmployees(1, 'initial');
  }, [fetchEmployees]);

  const refreshData = useCallback(() => {
    void fetchEmployees(1, 'refresh');
  }, [fetchEmployees]);

  const retry = useCallback(() => {
    void fetchEmployees(1, 'initial');
  }, [fetchEmployees]);

  const loadMore = useCallback(() => {
    if (loading || refreshing || loadingMore) {
      return;
    }

    if (meta.current_page >= meta.last_page) {
      return;
    }

    void fetchEmployees(meta.current_page + 1, 'load_more');
  }, [fetchEmployees, loading, loadingMore, meta.current_page, meta.last_page, refreshing]);

  const empty = useMemo(
    () => !loading && !refreshing && data.length === 0 && (error === null || error === 'Menampilkan data tersimpan di HP'),
    [data.length, error, loading, refreshing]
  );

  return {
    data,
    error,
    loading,
    empty,
    refreshing,
    loadingMore,
    searchInput,
    statusFilter,
    setSearchInput,
    setStatusFilter,
    refreshData,
    loadMore,
    retry,
  };
}
