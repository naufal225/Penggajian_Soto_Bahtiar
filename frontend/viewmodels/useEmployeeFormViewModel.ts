import { useCallback, useMemo, useState } from 'react';

import { ApiClientError } from '@/services/api/http-client';
import type { EmployeePayload } from '@/types/employee';

interface EmployeeFormInitialValue {
  name: string;
  phoneNumber: string;
  notes: string;
}

interface EmployeeFormFieldErrors {
  name?: string;
  phoneNumber?: string;
  notes?: string;
}

interface UseEmployeeFormViewModelOptions {
  initialValue?: EmployeeFormInitialValue;
  onSubmit: (payload: EmployeePayload) => Promise<void>;
  onUnauthorized: () => void;
}

function normalizeError(rawError: unknown): ApiClientError {
  if (rawError instanceof ApiClientError) {
    return rawError;
  }

  return new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
}

function firstFieldError(fieldErrors?: string[] | null): string | undefined {
  if (!fieldErrors || fieldErrors.length === 0) {
    return undefined;
  }

  return fieldErrors[0];
}

function mapGeneralError(error: ApiClientError): string {
  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Tidak bisa terhubung ke server';
  }

  if (error.code === 'EMPLOYEE_NOT_FOUND') {
    return 'Data karyawan tidak ditemukan';
  }

  if (error.code === 'VALIDATION_ERROR') {
    return 'Periksa kembali data yang diisi';
  }

  return 'Terjadi masalah, coba lagi';
}

export function useEmployeeFormViewModel({
  initialValue,
  onSubmit,
  onUnauthorized,
}: UseEmployeeFormViewModelOptions) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(initialValue?.phoneNumber ?? '');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EmployeeFormFieldErrors>({});

  const canSubmit = useMemo(() => !loading, [loading]);

  const applyInitialValue = useCallback((value: EmployeeFormInitialValue) => {
    setName(value.name);
    setPhoneNumber(value.phoneNumber);
    setNotes(value.notes);
  }, []);

  const submit = useCallback(async () => {
    setLoading(true);
    setSuccess(false);
    setGeneralError(null);
    setFieldErrors({});

    try {
      await onSubmit({
        name: name.trim(),
        phone_number: phoneNumber.trim() || null,
        notes: notes.trim() || null,
      });

      setSuccess(true);
    } catch (rawError) {
      const error = normalizeError(rawError);

      if (error.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

      setFieldErrors({
        name: firstFieldError(error.fields?.name),
        phoneNumber: firstFieldError(error.fields?.phone_number),
        notes: firstFieldError(error.fields?.notes),
      });
      setGeneralError(mapGeneralError(error));
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, [name, notes, onSubmit, onUnauthorized, phoneNumber]);

  return {
    name,
    phoneNumber,
    notes,
    loading,
    success,
    generalError,
    fieldErrors,
    canSubmit,
    setName,
    setPhoneNumber,
    setNotes,
    applyInitialValue,
    submit,
  };
}
