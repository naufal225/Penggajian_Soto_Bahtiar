import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SkeletonBlock from '@/components/ui/skeleton-block';
import { clearAuthToken } from '@/services/storage/session-storage';
import { useEmployeeDetailViewModel } from '@/viewmodels/useEmployeeDetailViewModel';

interface EmployeeDetailScreenProps {
  employeeId: number;
}

export default function EmployeeDetailScreen({ employeeId }: EmployeeDetailScreenProps) {
  const router = useRouter();

  const viewModel = useEmployeeDetailViewModel({
    employeeId,
    onUnauthorized: () => {
      void clearAuthToken();
      router.replace('/login');
    },
    onDeleted: () => {
      router.replace('/employees');
    },
  });

  if (viewModel.loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <SkeletonBlock style={styles.skeletonBackButton} />
          <View style={styles.skeletonProfileCard}>
            <SkeletonBlock style={styles.skeletonName} />
            <SkeletonBlock style={styles.skeletonBadge} />
            <SkeletonBlock style={styles.skeletonLabel} />
            <SkeletonBlock style={styles.skeletonValue} />
            <SkeletonBlock style={styles.skeletonLabel} />
            <SkeletonBlock style={styles.skeletonValueWide} />
          </View>
          <SkeletonBlock style={styles.skeletonActionButton} />
          <SkeletonBlock style={styles.skeletonActionButton} />
          <SkeletonBlock style={styles.skeletonActionButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (viewModel.error || !viewModel.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{viewModel.error ?? 'Data karyawan tidak ditemukan'}</Text>
          <Pressable style={styles.retryButton} onPress={viewModel.retry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
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

        <View style={styles.profileCard}>
          <Text style={styles.name}>{viewModel.data.name}</Text>
          <View style={[styles.badge, viewModel.data.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, viewModel.data.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {viewModel.data.is_active ? 'Aktif' : 'Nonaktif'}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Nomor HP</Text>
            <Text style={styles.infoValue}>{viewModel.data.phone_number || '-'}</Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Catatan</Text>
            <Text style={styles.infoValue}>{viewModel.data.notes || '-'}</Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push(`/employees/${employeeId}/edit`)}>
          <Text style={styles.primaryButtonText}>Ubah Data</Text>
        </Pressable>

        {viewModel.data.is_active ? (
          <Pressable
            style={[styles.warningButton, viewModel.actionLoading ? styles.buttonDisabled : null]}
            disabled={viewModel.actionLoading}
            onPress={viewModel.openDeactivateConfirm}>
            <Text style={styles.warningButtonText}>Nonaktifkan Karyawan</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.successButton, viewModel.actionLoading ? styles.buttonDisabled : null]}
            disabled={viewModel.actionLoading}
            onPress={viewModel.activateEmployee}>
            {viewModel.actionLoading ? (
              <ActivityIndicator color="#047857" />
            ) : (
              <Text style={styles.successButtonText}>Aktifkan Karyawan</Text>
            )}
          </Pressable>
        )}

        <Pressable
          style={[styles.dangerButton, !viewModel.canDelete ? styles.buttonDisabled : null]}
          disabled={!viewModel.canDelete}
          onPress={viewModel.openDeleteConfirm}>
          <Text style={styles.dangerButtonText}>Hapus Karyawan</Text>
        </Pressable>

        {viewModel.data.is_active ? (
          <Text style={styles.deleteHint}>Karyawan harus nonaktif terlebih dulu sebelum dihapus.</Text>
        ) : null}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={viewModel.showDeactivateConfirm}
        onRequestClose={viewModel.closeDeactivateConfirm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nonaktifkan Karyawan?</Text>
            <Text style={styles.modalDescription}>
              Karyawan yang nonaktif tidak akan muncul di daftar aktif. Anda masih bisa mengaktifkan lagi nanti.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                style={[styles.modalCancelButton, viewModel.actionLoading ? styles.buttonDisabled : null]}
                disabled={viewModel.actionLoading}
                onPress={viewModel.closeDeactivateConfirm}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} disabled={viewModel.actionLoading} onPress={viewModel.deactivateEmployee}>
                {viewModel.actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Ya, Nonaktifkan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={viewModel.showDeleteConfirm} onRequestClose={viewModel.closeDeleteConfirm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus Karyawan?</Text>
            <Text style={styles.modalDescription}>
              Data karyawan akan disembunyikan dari daftar. Riwayat gaji lama tetap aman.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                style={[styles.modalCancelButton, viewModel.actionLoading ? styles.buttonDisabled : null]}
                disabled={viewModel.actionLoading}
                onPress={viewModel.closeDeleteConfirm}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.modalDangerButton} disabled={viewModel.actionLoading} onPress={viewModel.removeEmployee}>
                {viewModel.actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Ya, Hapus</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 16,
    gap: 12,
  },
  loadingContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  skeletonBackButton: {
    width: 88,
    height: 38,
    borderRadius: 999,
  },
  skeletonProfileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  skeletonName: {
    width: '62%',
    height: 28,
    borderRadius: 8,
  },
  skeletonBadge: {
    width: 88,
    height: 30,
    borderRadius: 999,
  },
  skeletonLabel: {
    width: 84,
    height: 14,
    borderRadius: 6,
  },
  skeletonValue: {
    width: '54%',
    height: 18,
    borderRadius: 7,
  },
  skeletonValueWide: {
    width: '78%',
    height: 18,
    borderRadius: 7,
  },
  skeletonActionButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
  topBackButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  topBackButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  name: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 30,
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#166534',
  },
  badgeTextInactive: {
    color: '#475569',
  },
  infoGroup: {
    gap: 4,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    color: '#1F2937',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    minHeight: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  warningButton: {
    minHeight: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  warningButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  successButton: {
    minHeight: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
  },
  successButtonText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '700',
  },
  dangerButton: {
    minHeight: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteHint: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
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
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  modalDescription: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDangerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
