import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmployeeFormFields from '@/components/employees/EmployeeFormFields';
import { createEmployee, getEmployeeDetail, updateEmployee } from '@/services/api/employee-api';
import { ApiClientError } from '@/services/api/http-client';
import { clearAuthToken } from '@/services/storage/session-storage';
import { useEmployeeFormViewModel } from '@/viewmodels/useEmployeeFormViewModel';

interface EmployeeFormScreenProps {
  mode: 'create' | 'edit';
  employeeId?: number;
}

function mapInitialErrorMessage(error: ApiClientError): string {
  if (error.code === 'EMPLOYEE_NOT_FOUND') {
    return 'Data karyawan tidak ditemukan';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Tidak bisa terhubung ke server';
  }

  return 'Terjadi masalah, coba lagi';
}

export default function EmployeeFormScreen({ mode, employeeId }: EmployeeFormScreenProps) {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(mode === 'edit');
  const [initialError, setInitialError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    void clearAuthToken();
    router.replace('/login');
  }, [router]);

  const formViewModel = useEmployeeFormViewModel({
    onUnauthorized: handleUnauthorized,
    onSubmit: async (payload) => {
      if (mode === 'create') {
        const createdEmployee = await createEmployee(payload);
        router.replace(`/employees/${createdEmployee.id}`);
        return;
      }

      if (!employeeId) {
        throw new ApiClientError('ID karyawan tidak valid', 'EMPLOYEE_NOT_FOUND');
      }

      await updateEmployee(employeeId, payload);
      router.replace(`/employees/${employeeId}`);
    },
  });

  const applyInitialValue = formViewModel.applyInitialValue;

  useEffect(() => {
    if (mode !== 'edit' || !employeeId) {
      return;
    }

    let isMounted = true;

    const loadEmployee = async () => {
      setInitialLoading(true);
      setInitialError(null);

      try {
        const employee = await getEmployeeDetail(employeeId);

        if (!isMounted) {
          return;
        }

        applyInitialValue({
          name: employee.name,
          phoneNumber: employee.phone_number ?? '',
          notes: employee.notes ?? '',
        });
      } catch (rawError) {
        if (!isMounted) {
          return;
        }

        const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

        if (error.code === 'UNAUTHORIZED') {
          handleUnauthorized();
          return;
        }

        setInitialError(mapInitialErrorMessage(error));
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    void loadEmployee();

    return () => {
      isMounted = false;
    };
  }, [employeeId, mode, applyInitialValue, handleUnauthorized]);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.helperText}>Memuat data karyawan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (initialError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{initialError}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.topBackButton} onPress={() => router.back()}>
          <Text style={styles.topBackButtonText}>Kembali</Text>
        </Pressable>

        <EmployeeFormFields
          title={mode === 'create' ? 'Tambah Karyawan' : 'Ubah Data Karyawan'}
          submitLabel={mode === 'create' ? 'Simpan' : 'Simpan Perubahan'}
          name={formViewModel.name}
          phoneNumber={formViewModel.phoneNumber}
          notes={formViewModel.notes}
          loading={formViewModel.loading}
          generalError={formViewModel.generalError}
          nameError={formViewModel.fieldErrors.name}
          phoneNumberError={formViewModel.fieldErrors.phoneNumber}
          notesError={formViewModel.fieldErrors.notes}
          onNameChange={formViewModel.setName}
          onPhoneNumberChange={formViewModel.setPhoneNumber}
          onNotesChange={formViewModel.setNotes}
          onSubmit={formViewModel.submit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  topBackButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
  },
  topBackButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  helperText: {
    color: '#4B5563',
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
