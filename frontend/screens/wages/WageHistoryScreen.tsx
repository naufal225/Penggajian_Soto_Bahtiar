import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SkeletonBlock from '@/components/ui/skeleton-block';
import { clearAuthToken } from '@/services/storage/session-storage';
import type { WeekPeriodListItem, WeeklyPaymentHistoryCard } from '@/types/wage';
import { useWageHistoryViewModel } from '@/viewmodels/useWageHistoryViewModel';

function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
}

function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`;
  }

  const startLabel = start.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
  const endLabel = end.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });

  return `${startLabel} - ${endLabel}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapWeekStatus(status: WeekPeriodListItem['status']): string {
  if (status === 'fully_paid') {
    return 'Lunas';
  }

  if (status === 'partial_paid') {
    return 'Sebagian';
  }

  return 'Belum';
}

function paymentSourceLabel(card: WeeklyPaymentHistoryCard): string {
  return card.payment_scope === 'all' ? 'Bagian dari Bayar Semua' : 'Bayar Karyawan';
}

export default function WageHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialWeekPeriodId?: string | string[] }>();
  const initialWeekPeriodId = useMemo(() => {
    const rawValue = Array.isArray(params.initialWeekPeriodId) ? params.initialWeekPeriodId[0] : params.initialWeekPeriodId;
    const parsed = Number(rawValue);

    return Number.isFinite(parsed) ? parsed : null;
  }, [params.initialWeekPeriodId]);

  const handleUnauthorized = useCallback(() => {
    void clearAuthToken();
    router.replace('/login');
  }, [router]);

  const viewModel = useWageHistoryViewModel({
    initialWeekPeriodId,
    onUnauthorized: handleUnauthorized,
  });

  if (viewModel.loading && viewModel.weekPeriods.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContent}>
          <SkeletonBlock style={styles.skeletonHeader} />
          <SkeletonBlock style={styles.skeletonSummary} />
          <SkeletonBlock style={styles.skeletonWeekRow} />
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (viewModel.error && viewModel.weekPeriods.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerWrap}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.pageTitle}>Riwayat Pembayaran</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
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
        refreshControl={<RefreshControl refreshing={viewModel.refreshing} onRefresh={viewModel.refreshData} tintColor="#2563EB" />}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
        <View style={styles.headerWrap}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.pageTitle}>Riwayat Pembayaran</Text>
            <Text style={styles.pageSubtitle}>Lihat pembayaran gaji per karyawan untuk tiap periode.</Text>
          </View>
        </View>

        {viewModel.selectedWeek ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{formatWeekRange(viewModel.selectedWeek.start_date, viewModel.selectedWeek.end_date)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{mapWeekStatus(viewModel.selectedWeek.status)}</Text>
              </View>
            </View>

            <Text style={styles.summaryAmount}>{formatRupiah(viewModel.selectedWeek.summary.total_amount)}</Text>
            <View style={styles.summaryStatsRow}>
              <Text style={styles.summaryStatText}>{viewModel.selectedWeek.summary.employee_count} Karyawan</Text>
              <Text style={styles.summaryStatText}>{viewModel.selectedWeek.summary.paid_employee_count} Sudah Dibayar</Text>
              <Text style={styles.summaryStatText}>{viewModel.selectedWeek.summary.unpaid_employee_count} Belum Dibayar</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pilih Periode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekChipList}>
            {viewModel.weekPeriods.map((item) => {
              const isActive = item.id === viewModel.selectedWeekPeriodId;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => viewModel.selectWeekPeriod(item.id)}
                  style={[styles.weekChip, isActive ? styles.weekChipActive : null]}>
                  <Text style={[styles.weekChipText, isActive ? styles.weekChipTextActive : null]}>
                    {formatWeekRange(item.start_date, item.end_date)}
                  </Text>
                  <Text style={[styles.weekChipStatus, isActive ? styles.weekChipStatusActive : null]}>{mapWeekStatus(item.status)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listSection}>
          {viewModel.historyLoading ? (
            <View style={styles.loadingCardsWrap}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : viewModel.historyCards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Belum ada pembayaran di periode ini</Text>
              <Text style={styles.emptySubtitle}>Riwayat akan muncul setelah gaji dibayar.</Text>
            </View>
          ) : (
            viewModel.historyCards.map((card) => {
              const isUndoing = viewModel.undoingPaymentId === card.payment_id;

              return (
                <View key={card.history_item_id} style={styles.historyCard}>
                  <View style={styles.historyTopRow}>
                    <View style={styles.historyTextWrap}>
                      <Text style={styles.employeeName}>{card.employee_name ?? 'Karyawan'}</Text>
                      <Text style={styles.paymentSourceText}>{paymentSourceLabel(card)}</Text>
                    </View>
                    <Text style={styles.amountText}>{formatRupiah(card.total_amount)}</Text>
                  </View>

                  <Text style={styles.dateText}>Dibayar {formatDateTime(card.paid_at)}</Text>
                  {card.notes ? <Text style={styles.notesText}>{card.notes}</Text> : null}

                  {card.can_undo ? (
                    <View style={styles.cardActionRow}>
                      <Pressable
                        style={styles.undoButton}
                        onPress={() => viewModel.undoPayment(card.payment_id)}
                        disabled={isUndoing}>
                        {isUndoing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.undoButtonText}>Undo</Text>}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {viewModel.infoMessage ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{viewModel.infoMessage}</Text>
        </View>
      ) : null}

      {viewModel.error && viewModel.weekPeriods.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{viewModel.error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  loadingContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skeletonHeader: {
    height: 70,
    borderRadius: 16,
  },
  skeletonSummary: {
    height: 128,
    borderRadius: 16,
  },
  skeletonWeekRow: {
    height: 82,
    borderRadius: 16,
  },
  skeletonCard: {
    height: 126,
    borderRadius: 16,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  pageTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: '#64748B',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryAmount: {
    color: '#2563EB',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  summaryStatText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  weekChipList: {
    gap: 10,
  },
  weekChip: {
    minWidth: 148,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  weekChipActive: {
    backgroundColor: '#DBEAFE',
  },
  weekChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  weekChipTextActive: {
    color: '#1D4ED8',
  },
  weekChipStatus: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  weekChipStatusActive: {
    color: '#1D4ED8',
  },
  listSection: {
    gap: 10,
  },
  loadingCardsWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyTextWrap: {
    flex: 1,
    gap: 4,
  },
  employeeName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  paymentSourceText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  amountText: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '800',
  },
  dateText: {
    color: '#64748B',
    fontSize: 13,
  },
  notesText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  cardActionRow: {
    marginTop: 2,
    alignItems: 'flex-end',
  },
  undoButton: {
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  infoBannerText: {
    color: '#1D4ED8',
    fontSize: 13,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
  },
});
