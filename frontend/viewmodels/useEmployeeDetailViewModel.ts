import { useCallback, useEffect, useState } from 'react';

import {
  activateEmployee as activateEmployeeApi,
  deactivateEmployee as deactivateEmployeeApi,
  deleteEmployee,
  getEmployeeDetail,
} from '@/services/api/employee-api';
import { ApiClientError } from '@/services/api/http-client';
import type { EmployeeItem } from '@/types/employee';

interface UseEmployeeDetailViewModelOptions {
  employeeId: number;
  onUnauthorized: () => void;
  onDeleted: () => void;
}

function normalizeError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  return new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
}

function mapErrorMessage(error: ApiClientError): string {
  if (error.code === 'EMPLOYEE_NOT_FOUND') {
    return 'Data karyawan tidak ditemukan';
  }

  if (error.code === 'FORBIDDEN_ACTION') {
    return 'Aksi tidak diizinkan';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Tidak bisa terhubung ke server';
  }

  return 'Terjadi masalah, coba lagi';
}

export function useEmployeeDetailViewModel({ employeeId, onUnauthorized, onDeleted }: UseEmployeeDetailViewModelOptions) {
  const [data, setData] = useState<EmployeeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getEmployeeDetail(employeeId);
      setData(response);
      setError(null);
    } catch (rawError) {
      const errorObject = normalizeError(rawError);

      if (errorObject.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

      setError(mapErrorMessage(errorObject));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId, onUnauthorized]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const openDeactivateConfirm = useCallback(() => {
    if (!data?.is_active || actionLoading) {
      return;
    }

    setShowDeactivateConfirm(true);
  }, [actionLoading, data?.is_active]);

  const closeDeactivateConfirm = useCallback(() => {
    if (actionLoading) {
      return;
    }

    setShowDeactivateConfirm(false);
  }, [actionLoading]);

  const openDeleteConfirm = useCallback(() => {
    if (!data || data.is_active || actionLoading) {
      return;
    }

    setShowDeleteConfirm(true);
  }, [actionLoading, data]);

  const closeDeleteConfirm = useCallback(() => {
    if (actionLoading) {
      return;
    }

    setShowDeleteConfirm(false);
  }, [actionLoading]);

  const deactivateEmployee = useCallback(async () => {
    if (!data?.is_active) {
      return;
    }

    setActionLoading(true);

    try {
      await deactivateEmployeeApi(employeeId);
      setShowDeactivateConfirm(false);
      await loadDetail();
    } catch (rawError) {
      const errorObject = normalizeError(rawError);

      if (errorObject.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

      setError(mapErrorMessage(errorObject));
    } finally {
      setActionLoading(false);
    }
  }, [data?.is_active, employeeId, loadDetail, onUnauthorized]);

  const activateEmployee = useCallback(async () => {
    if (!data || data.is_active) {
      return;
    }

    setActionLoading(true);

    try {
      await activateEmployeeApi(employeeId);
      await loadDetail();
    } catch (rawError) {
      const errorObject = normalizeError(rawError);

      if (errorObject.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

      setError(mapErrorMessage(errorObject));
    } finally {
      setActionLoading(false);
    }
  }, [data, employeeId, loadDetail, onUnauthorized]);

  const removeEmployee = useCallback(async () => {
    if (!data || data.is_active) {
      return;
    }

    setActionLoading(true);

    try {
      await deleteEmployee(employeeId);
      setShowDeleteConfirm(false);
      onDeleted();
    } catch (rawError) {
      const errorObject = normalizeError(rawError);

      if (errorObject.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

      setError(mapErrorMessage(errorObject));
    } finally {
      setActionLoading(false);
    }
  }, [data, employeeId, onDeleted, onUnauthorized]);

  return {
    data,
    loading,
    error,
    actionLoading,
    showDeactivateConfirm,
    showDeleteConfirm,
    canDelete: !!data && !data.is_active && !actionLoading,
    openDeactivateConfirm,
    closeDeactivateConfirm,
    openDeleteConfirm,
    closeDeleteConfirm,
    deactivateEmployee,
    activateEmployee,
    removeEmployee,
    retry: loadDetail,
  };
}
