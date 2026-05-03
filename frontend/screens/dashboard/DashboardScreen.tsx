import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { type ComponentProps, useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SkeletonBlock from '@/components/ui/skeleton-block';
import { clearAuthToken } from '@/services/storage/session-storage';
import { useDashboardViewModel } from '@/viewmodels/useDashboardViewModel';

function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
}

function formatDashboardDate(value: string): string {
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface MetricCardProps {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  value: string;
  subtitle: string;
  onPress: () => void;
  large?: boolean;
}

function MetricCard({ icon, title, value, subtitle, onPress, large = false }: MetricCardProps) {
  return (
    <Pressable style={[styles.metricCard, large ? styles.metricCardLarge : null]} onPress={onPress}>
      <View style={[styles.iconWrap, large ? styles.iconWrapLarge : null]}>
        <MaterialIcons name={icon} size={large ? 22 : 20} color="#EAF2FF" />
      </View>
      <Text style={[styles.metricTitle, large ? styles.metricTitleLarge : null]}>{title}</Text>
      <Text style={[styles.metricValue, large ? styles.metricValueLarge : null]}>{value}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleUnauthorized = useCallback(() => {
    void clearAuthToken();
    router.replace('/login');
  }, [router]);

  const viewModel = useDashboardViewModel({
    onUnauthorized: handleUnauthorized,
  });
  const formattedLastUpdated = formatDateTime(viewModel.lastUpdatedAt);

  if (viewModel.loading && !viewModel.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContent}>
          <SkeletonBlock style={styles.skeletonDate} />
          <SkeletonBlock style={styles.skeletonGreeting} />
          <SkeletonBlock style={styles.skeletonPrimaryCard} />
          <View style={styles.rowCards}>
            <SkeletonBlock style={styles.skeletonSmallCard} />
            <SkeletonBlock style={styles.skeletonSmallCard} />
          </View>
          <SkeletonBlock style={styles.skeletonSummaryCard} />
          <SkeletonBlock style={styles.skeletonPaymentCard} />
          <SkeletonBlock style={styles.skeletonPaymentCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (!viewModel.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{viewModel.error ?? 'Dashboard belum tersedia'}</Text>
          <Pressable style={styles.retryButton} onPress={viewModel.retry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={viewModel.refreshing} onRefresh={viewModel.refresh} tintColor="#1D4ED8" />}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 90 }]}>
        <Text style={styles.dateText}>{formatDashboardDate(viewModel.data.today_date)}</Text>
        <Text style={styles.greetingText}>Halo, {viewModel.data.owner_name}</Text>

        <MetricCard
          large
          icon="account-balance-wallet"
          title="Gaji Hari Ini"
          value={formatRupiah(viewModel.data.today_total_amount)}
          subtitle="Total hari ini"
          onPress={() => router.push('/explore')}
        />

        <View style={styles.rowCards}>
          <MetricCard
            icon="calendar-month"
            title="Pembayaran Minggu Ini"
            value={formatRupiah(viewModel.data.current_week.total_amount)}
            subtitle="Total minggu ini"
            onPress={() => router.push('/explore')}
          />
          <MetricCard
            icon="groups"
            title="Data Karyawan"
            value={`${viewModel.data.active_employee_count} Karyawan`}
            subtitle="Aktif saat ini"
            onPress={() => router.push('/employees')}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total minggu ini:</Text>
          <Text style={styles.summaryAmount}>{formatRupiah(viewModel.data.current_week.total_amount)}</Text>

          <View style={styles.innerDivider} />

          <View style={styles.statRow}>
            <View style={[styles.statIconBox, styles.statIconBlue]}>
              <MaterialIcons name="person" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statText}>{viewModel.data.active_employee_count} Karyawan aktif</Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statIconBox, styles.statIconGreen]}>
              <MaterialIcons name="check-circle" size={20} color="#16A34A" />
            </View>
            <Text style={styles.statTextSuccess}>{viewModel.data.today_filled_count} Sudah diisi hari ini</Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statIconBox, styles.statIconOrange]}>
              <MaterialIcons name="error" size={20} color="#EA580C" />
            </View>
            <Text style={styles.statTextWarning}>{viewModel.data.today_unfilled_count} Belum diisi</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>STATUS PEMBAYARAN</Text>

        <View style={styles.paymentStatusPaid}>
          <Text style={styles.paymentStatusPaidText}>Sudah dibayar</Text>
          <View style={styles.pillPaid}>
            <Text style={styles.pillPaidText}>{viewModel.data.current_week.paid_employee_count} orang</Text>
          </View>
        </View>

        <View style={styles.paymentStatusUnpaid}>
          <Text style={styles.paymentStatusUnpaidText}>Belum dibayar</Text>
          <View style={styles.pillUnpaid}>
            <Text style={styles.pillUnpaidText}>{viewModel.data.current_week.unpaid_employee_count} orang</Text>
          </View>
        </View>

        {viewModel.infoMessage || viewModel.pendingSyncCount > 0 || formattedLastUpdated ? (
          <View style={styles.infoBanner}>
            {viewModel.infoMessage ? <Text style={styles.infoBannerText}>{viewModel.infoMessage}</Text> : null}
            {viewModel.pendingSyncCount > 0 ? (
              <Text style={styles.infoBannerText}>Belum terkirim: {viewModel.pendingSyncCount}</Text>
            ) : null}
            {formattedLastUpdated ? <Text style={styles.infoBannerText}>Terakhir diperbarui: {formattedLastUpdated}</Text> : null}
          </View>
        ) : null}

        {viewModel.error ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>{viewModel.error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },
  loadingContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },
  skeletonDate: {
    width: '48%',
    height: 14,
    borderRadius: 7,
  },
  skeletonGreeting: {
    width: '58%',
    height: 24,
    borderRadius: 9,
  },
  skeletonPrimaryCard: {
    height: 198,
    borderRadius: 18,
  },
  skeletonSmallCard: {
    flex: 1,
    height: 142,
    borderRadius: 16,
  },
  skeletonSummaryCard: {
    height: 258,
    borderRadius: 22,
  },
  skeletonPaymentCard: {
    height: 92,
    borderRadius: 18,
  },
  dateText: {
    color: '#64748B',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  greetingText: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#3E78BF',
    borderRadius: 16,
    minHeight: 142,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 7,
    elevation: 5,
  },
  metricCardLarge: {
    minHeight: 198,
    borderRadius: 18,
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapLarge: {
    width: 42,
    height: 42,
  },
  metricTitle: {
    color: '#D7E6FF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  metricTitleLarge: {
    fontSize: 15,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  metricValueLarge: {
    fontSize: 42,
  },
  metricSubtitle: {
    color: '#D7E6FF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  rowCards: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    marginTop: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DFE3E9',
    padding: 18,
    gap: 12,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  summaryAmount: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  innerDivider: {
    marginTop: 4,
    height: 1,
    backgroundColor: '#D6D9DE',
  },
  statRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBlue: {
    backgroundColor: '#DBEAFE',
  },
  statIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  statIconOrange: {
    backgroundColor: '#FDE8CE',
  },
  statText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  statTextSuccess: {
    color: '#15803D',
    fontSize: 15,
    fontWeight: '700',
  },
  statTextWarning: {
    color: '#C2410C',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 14,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  paymentStatusPaid: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BCE8CC',
    backgroundColor: '#E7F8EC',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentStatusPaidText: {
    color: '#166534',
    fontSize: 17,
    fontWeight: '700',
  },
  pillPaid: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPaidText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentStatusUnpaid: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5D4AE',
    backgroundColor: '#F4EEE7',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentStatusUnpaidText: {
    color: '#9A3412',
    fontSize: 17,
    fontWeight: '700',
  },
  pillUnpaid: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: '#EA580C',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillUnpaidText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    textAlign: 'center',
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
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoBanner: {
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoBannerText: {
    color: '#1D4ED8',
    textAlign: 'center',
    fontSize: 13,
  },
});
