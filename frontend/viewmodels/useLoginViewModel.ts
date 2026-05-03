import { Platform } from 'react-native';
import { useMemo, useState } from 'react';

import { login as loginApi } from '@/services/api/auth-api';
import { ApiClientError } from '@/services/api/http-client';
import { saveAuthToken } from '@/services/storage/session-storage';

type LoginStatus = 'idle' | 'loading' | 'error' | 'success';

interface LoginFieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

const DEVICE_NAME = `expo-${Platform.OS}-owner`;

function firstFieldError(field?: string[]): string | undefined {
  return field?.[0];
}

function mapGeneralError(error: ApiClientError): string {
  if (error.code === 'UNAUTHORIZED') {
    return 'Email atau password salah';
  }

  if (error.code === 'VALIDATION_ERROR') {
    return 'Data login belum lengkap';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Tidak bisa terhubung ke server';
  }

  if (error.code === 'BASE_URL_NOT_CONFIGURED') {
    return 'Alamat server belum diatur';
  }

  return 'Terjadi masalah, coba lagi';
}

export function useLoginViewModel(onSuccess: () => void) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [errors, setErrors] = useState<LoginFieldErrors>({});

  const canSubmit = useMemo(() => status !== 'loading', [status]);

  const submitLogin = async () => {
    setStatus('loading');
    setErrors({});

    try {
      const response = await loginApi({
        email: email.trim(),
        password,
        device_name: DEVICE_NAME,
      });

      await saveAuthToken(response.token);
      setStatus('success');
      onSuccess();
    } catch (error) {
      const clientError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

      setErrors({
        email: firstFieldError(clientError.fields?.email),
        password: firstFieldError(clientError.fields?.password),
        general: mapGeneralError(clientError),
      });
      setStatus('error');
    }
  };

  return {
    email,
    password,
    status,
    errors,
    canSubmit,
    setEmail,
    setPassword,
    submitLogin,
  };
}
