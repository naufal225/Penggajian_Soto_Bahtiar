import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SkeletonBlock from '@/components/ui/skeleton-block';
import { clearAuthToken } from '@/services/storage/session-storage';
import { useWageHomeViewModel } from '@/viewmodels/useWageHomeViewModel';

const PRESET_AMOUNTS = [50000, 70000, 100000];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

type ExportField = 'start' | 'end';

function toDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTodayDate(): string {
  return toDateString(new Date());
}

function countInclusiveDays(startDate: string, endDate: string): number {
  const start = toDate(startDate);
  const end = toDate(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDateRangeLabel(dateString: string): string {
  const date = toDate(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarDays(monthCursor: Date): Array<{ key: string; label: string; dateString: string | null }> {
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const leadingEmptyCount = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const cells: Array<{ key: string; label: string; dateString: string | null }> = [];

  for (let index = 0; index < leadingEmptyCount; index += 1) {
    cells.push({
      key: `empty-start-${index}`,
      label: '',
      dateString: null,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
    cells.push({
      key: toDateString(currentDate),
      label: String(day),
      dateString: toDateString(currentDate),
    });
  }

  while (cells.length % 7 !== 0) {
    const index = cells.length;
    cells.push({
      key: `empty-end-${index}`,
      label: '',
      dateString: null,
    });
  }

  return cells;
}

function validateRange(startDate: string, endDate: string): string | null {
  if (endDate < startDate) {
    return 'Tanggal akhir tidak boleh sebelum tanggal awal';
  }

  if (countInclusiveDays(startDate, endDate) > 31) {
    return 'Rentang laporan maksimal 31 hari';
  }

  return null;
}

function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
}

function formatDateLabel(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function statusStyle(statusLabel: string) {
  if (statusLabel === 'Sudah Dibayar') {
    return styles.statusPaid;
  }

  if (statusLabel === 'Belum Dibayar') {
    return styles.statusUnpaid;
  }

  return styles.statusEmpty;
}

function statusTextStyle(statusLabel: string) {
  if (statusLabel === 'Sudah Dibayar') {
    return styles.statusPaidText;
  }

  if (statusLabel === 'Belum Dibayar') {
    return styles.statusUnpaidText;
  }

  return styles.statusEmptyText;
}

export default function WageHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hasFocusedRef = useRef(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<string>(() => formatTodayDate());
  const [reportEndDate, setReportEndDate] = useState<string>(() => formatTodayDate());
  const [reportField, setReportField] = useState<ExportField>('start');
  const [reportRangeError, setReportRangeError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const today = toDate(formatTodayDate());
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const handleUnauthorized = useCallback(() => {
    void clearAuthToken();
    router.replace('/login');
  }, [router]);

  const viewModel = useWageHomeViewModel({
    onUnauthorized: handleUnauthorized,
  });

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedRef.current) {
        viewModel.refresh();
        return;
      }

      hasFocusedRef.current = true;
    }, [viewModel.refresh])
  );

  const weekSummary = viewModel.weekInfo?.summary;
  const bottomInset = Math.max(insets.bottom, 10);
  const tabBarBottomSpacing = Platform.select({
    ios: Math.max(insets.bottom - 4, 10),
    default: 10,
  });
  const tabBarHeight = Platform.select({
    ios: 64 + bottomInset,
    default: 62 + bottomInset,
  }) ?? 62 + bottomInset;
  const floatingFooterBottom = tabBarHeight + tabBarBottomSpacing + 8;
  const showSaveFooter = viewModel.changedCount > 0;
  const openHistoryPage = useCallback(() => {
    if (!viewModel.weekInfo) {
      return;
    }

    router.push({
      pathname: '/wages/history',
      params: {
        initialWeekPeriodId: String(viewModel.weekInfo.id),
      },
    });
  }, [router, viewModel.weekInfo]);

  const saveButtonLabel = useMemo(() => {
    if (viewModel.changedCount === 0) {
      return 'Tidak Ada Perubahan';
    }

    return `Simpan Semua (${viewModel.changedCount})`;
  }, [viewModel.changedCount]);

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const openReportModal = useCallback(() => {
    const nextStartDate = viewModel.weekInfo?.start_date ?? viewModel.selectedDate;
    const nextEndDate = viewModel.selectedDate < nextStartDate ? nextStartDate : viewModel.selectedDate;
    setReportStartDate(nextStartDate);
    setReportEndDate(nextEndDate);
    setReportField('start');
    setReportRangeError(null);
    const monthDate = toDate(nextStartDate);
    setCalendarMonth(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
    setReportModalVisible(true);
  }, [viewModel.selectedDate, viewModel.weekInfo]);

  const closeReportModal = useCallback(() => {
    if (viewModel.exporting) {
      return;
    }

    setReportModalVisible(false);
    setReportRangeError(null);
  }, [viewModel.exporting]);

  const moveCalendarMonth = useCallback((delta: number) => {
    setCalendarMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + delta, 1));
  }, []);

  const selectCalendarDate = useCallback(
    (dateString: string) => {
      if (reportField === 'start') {
        const nextEndDate = reportEndDate < dateString ? dateString : reportEndDate;
        setReportStartDate(dateString);
        setReportEndDate(nextEndDate);
        setReportField('end');
        setReportRangeError(validateRange(dateString, nextEndDate));
        return;
      }

      const nextStartDate = reportStartDate > dateString ? dateString : reportStartDate;
      setReportStartDate(nextStartDate);
      setReportEndDate(dateString);
      setReportRangeError(validateRange(nextStartDate, dateString));
    },
    [reportEndDate, reportField, reportStartDate]
  );

  const confirmExportReport = useCallback(async () => {
    const nextError = validateRange(reportStartDate, reportEndDate);
    if (nextError) {
      setReportRangeError(nextError);
      return;
    }

    await viewModel.exportPdf(reportStartDate, reportEndDate);
    setReportModalVisible(false);
  }, [reportEndDate, reportStartDate, viewModel]);

  if (viewModel.loading && viewModel.employeeRows.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContent}>
          <SkeletonBlock style={styles.skeletonHeaderCard} />
          <SkeletonBlock style={styles.skeletonDateRow} />
          <SkeletonBlock style={styles.skeletonFilterRow} />
          <SkeletonBlock style={styles.skeletonEmployeeCard} />
          <SkeletonBlock style={styles.skeletonEmployeeCard} />
          <SkeletonBlock style={styles.skeletonEmployeeCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (viewModel.error && viewModel.employeeRows.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
        refreshControl={<RefreshControl refreshing={viewModel.refreshing} onRefresh={viewModel.refresh} tintColor="#1D4ED8" />}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: showSaveFooter ? floatingFooterBottom + 86 : tabBarHeight + tabBarBottomSpacing + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeadRow}>
            <Text style={styles.summaryTitle}>Gaji Hari Ini</Text>
            <Text style={styles.summaryDate}>{formatDateLabel(viewModel.selectedDate)}</Text>
          </View>

          <Text style={styles.summaryAmount}>{formatRupiah(viewModel.selectedDateTotal)}</Text>
          <Text style={styles.summarySubtext}>Total tanggal ini</Text>

          <View style={styles.summaryStatsRow}>
            <Text style={styles.summaryStatText}>{weekSummary?.employee_count ?? 0} Karyawan</Text>
            <Text style={styles.summaryStatText}>{weekSummary?.paid_employee_count ?? 0} Sudah dibayar</Text>
            <Text style={styles.summaryStatText}>Belum dibayar ({viewModel.unpaidCount})</Text>
          </View>

          <View style={styles.summaryActionRow}>
            <Pressable style={styles.outlineActionButton} onPress={openHistoryPage}>
              <MaterialIcons name="history" size={18} color="#1D4ED8" />
              <Text style={styles.outlineActionText}>Riwayat</Text>
            </Pressable>
            <Pressable style={styles.outlineActionButton} onPress={openReportModal} disabled={viewModel.exporting}>
              {viewModel.exporting ? (
                <ActivityIndicator color="#1D4ED8" />
              ) : (
                <>
                  <MaterialIcons name="picture-as-pdf" size={18} color="#1D4ED8" />
                  <Text style={styles.outlineActionText}>Simpan PDF</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.payAllButton, !viewModel.canPayAll ? styles.payAllButtonDisabled : null]}
              onPress={viewModel.openPayAllModal}
              disabled={!viewModel.canPayAll}>
              <Text style={styles.payAllButtonText}>Bayar Semua</Text>
            </Pressable>
          </View>
        </View>

        {viewModel.infoMessage || viewModel.pendingSyncCount > 0 || viewModel.isOffline ? (
          <View style={styles.infoBanner}>
            {viewModel.infoMessage ? <Text style={styles.infoBannerText}>{viewModel.infoMessage}</Text> : null}
            {viewModel.isOffline ? <Text style={styles.infoBannerText}>Tidak ada koneksi internet</Text> : null}
            {viewModel.pendingSyncCount > 0 ? (
              <Text style={styles.infoBannerText}>Belum terkirim: {viewModel.pendingSyncCount}</Text>
            ) : null}
          </View>
        ) : null}

        {viewModel.exportMessage || viewModel.lastExportedFileName ? (
          <View style={styles.exportBanner}>
            <Pressable style={styles.exportBannerCloseButton} onPress={viewModel.clearExportFeedback}>
              <MaterialIcons name="close" size={18} color="#15803D" />
            </Pressable>
            {viewModel.exportMessage ? <Text style={styles.exportBannerText}>{viewModel.exportMessage}</Text> : null}
            {viewModel.lastExportedFileName ? <Text style={styles.exportBannerFileText}>{viewModel.lastExportedFileName}</Text> : null}
            {viewModel.lastExportedFileName ? (
              <Pressable
                style={[styles.exportShareButton, viewModel.sharingExport ? styles.exportShareButtonDisabled : null]}
                onPress={viewModel.shareLastExportedPdf}
                disabled={viewModel.sharingExport}>
                {viewModel.sharingExport ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.exportShareButtonText}>Bagikan PDF</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pilih Tanggal Periode Ini</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChipList}>
            {viewModel.weekDates.map((date) => {
              const isActive = date === viewModel.selectedDate;

              return (
                <Pressable
                  key={date}
                  onPress={() => viewModel.requestDateChange(date)}
                  style={[styles.dateChip, isActive ? styles.dateChipActive : null]}>
                  <Text style={[styles.dateChipText, isActive ? styles.dateChipTextActive : null]}>{formatDateLabel(date)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listSection}>
          {viewModel.employeeRows.map((row) => {
            const isPending = viewModel.pendingActions.includes(row.employeeId);
            const canPayEmployee =
              row.canPayNow &&
              row.hasDailyRecord &&
              row.currentAmount > 0 &&
              row.weekUnpaidAmount > 0 &&
              !row.hasUnsavedChange &&
              !viewModel.paymentActionLoading &&
              !isPending;

            return (
              <View key={row.employeeId} style={[styles.employeeCard, row.isLocked ? styles.employeeCardLocked : null]}>
                <View style={styles.employeeHeader}>
                  <View style={styles.employeeTitleWrap}>
                    <Text style={styles.employeeName}>{row.employeeName}</Text>
                    <View style={[styles.statusPill, statusStyle(row.paymentStatusLabel)]}>
                      <Text style={[styles.statusPillText, statusTextStyle(row.paymentStatusLabel)]}>{row.paymentStatusLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.paymentStatusWrap}>
                    <Text style={[styles.paymentStatusText, row.weekPaymentStatus === 'paid' ? styles.paymentPaidText : styles.paymentUnpaidText]}>
                      {row.weekPaymentStatus === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                    </Text>
                    <Text style={styles.weekAmountText}>Sisa {formatRupiah(row.weekUnpaidAmount)}</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nominal Hari Ini</Text>
                  <View style={[styles.amountInputWrap, row.isLocked ? styles.disabledInputWrap : null]}>
                    <Text style={styles.currencyLabel}>Rp</Text>
                    <TextInput
                      value={row.amountInput}
                      onChangeText={(value) => viewModel.setAmountInput(row.employeeId, value)}
                      keyboardType="number-pad"
                      editable={!row.isLocked && !viewModel.submitting}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      style={styles.amountInput}
                    />
                  </View>
                </View>

                <View style={styles.presetRow}>
                  {PRESET_AMOUNTS.map((preset) => (
                    <Pressable
                      key={`${row.employeeId}-${preset}`}
                      style={[styles.presetButton, row.isLocked ? styles.presetButtonDisabled : null]}
                      onPress={() => viewModel.applyPresetAmount(row.employeeId, preset)}
                      disabled={row.isLocked || viewModel.submitting}>
                      <Text style={styles.presetButtonText}>{new Intl.NumberFormat('id-ID').format(preset / 1000)}rb</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
                  <TextInput
                    value={row.notesInput}
                    onChangeText={(value) => viewModel.setNotesInput(row.employeeId, value)}
                    editable={!row.isLocked && !viewModel.submitting}
                    placeholder="Tambahan catatan"
                    placeholderTextColor="#9CA3AF"
                    style={[styles.notesInput, row.isLocked ? styles.disabledInputWrap : null]}
                  />
                </View>

                <View style={styles.cardFooterRow}>
                  <Text style={styles.syncInfoText}>{row.syncMessage}</Text>
                  <Pressable
                    style={[styles.payEmployeeButton, !canPayEmployee ? styles.payEmployeeButtonDisabled : null]}
                    onPress={() => viewModel.openPayEmployeeModal(row.employeeId, row.employeeName)}
                    disabled={!canPayEmployee}>
                    {isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payEmployeeButtonText}>Bayar</Text>}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {viewModel.error ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>{viewModel.error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {showSaveFooter ? (
        <View style={[styles.saveFooter, { bottom: floatingFooterBottom }]}>
          <Pressable style={styles.saveButton} disabled={viewModel.submitting} onPress={viewModel.saveAllChanges}>
            {viewModel.submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>}
          </Pressable>
        </View>
      ) : null}

      <Modal transparent visible={viewModel.modal !== null} animationType="fade" onRequestClose={viewModel.cancelModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {viewModel.modal?.type === 'pay_employee' ? (
              <>
                <Text style={styles.modalTitle}>Bayar Karyawan Ini?</Text>
                <Text style={styles.modalDescription}>Gaji yang belum dibayar untuk {viewModel.modal.employeeName} akan ditandai sudah dibayar.</Text>
              </>
            ) : null}

            {viewModel.modal?.type === 'pay_all' ? (
              <>
                <Text style={styles.modalTitle}>Bayar Semua Karyawan?</Text>
                <Text style={styles.modalDescription}>Semua gaji karyawan yang belum dibayar pada periode ini akan ditandai sudah dibayar.</Text>
              </>
            ) : null}

            {viewModel.modal?.type === 'discard_changes' ? (
              <>
                <Text style={styles.modalTitle}>Buang Perubahan?</Text>
                <Text style={styles.modalDescription}>Perubahan yang belum disimpan akan hilang jika pindah tanggal.</Text>
              </>
            ) : null}

            <View style={styles.modalActionRow}>
              <Pressable style={styles.modalCancelButton} onPress={viewModel.cancelModal} disabled={viewModel.paymentActionLoading}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              {viewModel.modal?.type === 'discard_changes' ? (
                <Pressable style={styles.modalConfirmButton} onPress={viewModel.confirmDiscardAndChangeDate}>
                  <Text style={styles.modalConfirmText}>Buang & Lanjut</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.modalDangerButton} onPress={viewModel.confirmPayment} disabled={viewModel.paymentActionLoading}>
                  {viewModel.paymentActionLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Ya, Lanjut</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={reportModalVisible} animationType="fade" onRequestClose={closeReportModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.modalTitle}>Pilih Tanggal Laporan</Text>
              <Pressable onPress={closeReportModal} style={styles.reportModalCloseButton}>
                <MaterialIcons name="close" size={20} color="#475569" />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>Pilih tanggal awal dan akhir. Maksimal 31 hari.</Text>

            <View style={styles.reportRangeRow}>
              <Pressable
                style={[styles.reportRangeButton, reportField === 'start' ? styles.reportRangeButtonActive : null]}
                onPress={() => setReportField('start')}>
                <Text style={styles.reportRangeLabel}>Dari Tanggal</Text>
                <Text style={[styles.reportRangeValue, reportField === 'start' ? styles.reportRangeValueActive : null]}>
                  {formatDateRangeLabel(reportStartDate)}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.reportRangeButton, reportField === 'end' ? styles.reportRangeButtonActive : null]}
                onPress={() => setReportField('end')}>
                <Text style={styles.reportRangeLabel}>Sampai Tanggal</Text>
                <Text style={[styles.reportRangeValue, reportField === 'end' ? styles.reportRangeValueActive : null]}>
                  {formatDateRangeLabel(reportEndDate)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.calendarHeaderRow}>
              <Pressable style={styles.calendarNavButton} onPress={() => moveCalendarMonth(-1)}>
                <MaterialIcons name="chevron-left" size={20} color="#1D4ED8" />
              </Pressable>
              <Text style={styles.calendarMonthLabel}>{getMonthLabel(calendarMonth)}</Text>
              <Pressable style={styles.calendarNavButton} onPress={() => moveCalendarMonth(1)}>
                <MaterialIcons name="chevron-right" size={20} color="#1D4ED8" />
              </Pressable>
            </View>

            <View style={styles.calendarWeekHeaderRow}>
              {DAY_NAMES.map((dayName) => (
                <Text key={dayName} style={styles.calendarWeekHeaderText}>
                  {dayName}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((item) => {
                const isEmpty = item.dateString === null;
                const isSelectedStart = item.dateString === reportStartDate;
                const isSelectedEnd = item.dateString === reportEndDate;
                const isRangeDay =
                  item.dateString !== null && item.dateString >= reportStartDate && item.dateString <= reportEndDate;

                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.calendarDayCell,
                      isRangeDay ? styles.calendarDayInRange : null,
                      isSelectedStart || isSelectedEnd ? styles.calendarDaySelected : null,
                      isEmpty ? styles.calendarDayEmpty : null,
                    ]}
                    onPress={() => (item.dateString ? selectCalendarDate(item.dateString) : undefined)}
                    disabled={isEmpty}>
                    <Text
                      style={[
                        styles.calendarDayText,
                        isRangeDay ? styles.calendarDayTextInRange : null,
                        isSelectedStart || isSelectedEnd ? styles.calendarDayTextSelected : null,
                        isEmpty ? styles.calendarDayTextEmpty : null,
                      ]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.reportModalInfoText}>Total rentang: {countInclusiveDays(reportStartDate, reportEndDate)} hari</Text>
            {reportRangeError ? <Text style={styles.reportModalErrorText}>{reportRangeError}</Text> : null}

            <View style={styles.modalActionRow}>
              <Pressable style={styles.modalCancelButton} onPress={closeReportModal} disabled={viewModel.exporting}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} onPress={confirmExportReport} disabled={viewModel.exporting}>
                {viewModel.exporting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Simpan PDF</Text>}
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
    backgroundColor: '#F1F5F9',
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
  skeletonHeaderCard: {
    height: 196,
    borderRadius: 16,
  },
  skeletonDateRow: {
    height: 86,
    borderRadius: 14,
  },
  skeletonFilterRow: {
    height: 38,
    borderRadius: 999,
  },
  skeletonEmployeeCard: {
    height: 236,
    borderRadius: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryDate: {
    fontSize: 13,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  summaryAmount: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: '800',
    color: '#2563EB',
  },
  summarySubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  summaryStatText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  summaryActionRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  outlineActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#EFF6FF',
  },
  outlineActionText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  payAllButton: {
    minWidth: 108,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  payAllButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  payAllButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  dateChipList: {
    gap: 8,
  },
  dateChip: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: '#2563EB',
  },
  dateChipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  listSection: {
    gap: 10,
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  employeeCardLocked: {
    backgroundColor: '#F8FAFC',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  employeeTitleWrap: {
    flex: 1,
    gap: 6,
  },
  employeeName: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  paymentStatusWrap: {
    alignItems: 'flex-end',
    gap: 3,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentPaidText: {
    color: '#166534',
  },
  paymentUnpaidText: {
    color: '#92400E',
  },
  weekAmountText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPaid: {
    backgroundColor: '#DBEAFE',
  },
  statusPaidText: {
    color: '#1D4ED8',
  },
  statusUnpaid: {
    backgroundColor: '#FEE2E2',
  },
  statusUnpaidText: {
    color: '#DC2626',
  },
  statusEmpty: {
    backgroundColor: '#F1F5F9',
  },
  statusEmptyText: {
    color: '#475569',
  },
  statusDraft: {
    backgroundColor: '#DBEAFE',
  },
  statusDraftText: {
    color: '#1D4ED8',
  },
  statusSaved: {
    backgroundColor: '#E2E8F0',
  },
  statusSavedText: {
    color: '#334155',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  amountInputWrap: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  disabledInputWrap: {
    opacity: 0.7,
  },
  currencyLabel: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 44,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  presetButtonDisabled: {
    opacity: 0.5,
  },
  presetButtonText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 14,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  syncInfoText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  payEmployeeButton: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  payEmployeeButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  payEmployeeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  saveFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  modalDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  historyList: {
    maxHeight: 260,
    gap: 8,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  historyTextWrap: {
    flex: 1,
    gap: 4,
  },
  historyItemTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  historyItemAmount: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  historyUndoButton: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyUndoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  modalCancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDangerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoBannerText: {
    color: '#1D4ED8',
    fontSize: 13,
    textAlign: 'center',
  },
  exportBanner: {
    position: 'relative',
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  exportBannerCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBannerText: {
    color: '#166534',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
    paddingRight: 22,
  },
  exportBannerFileText: {
    color: '#15803D',
    fontSize: 12,
    textAlign: 'center',
    paddingRight: 22,
  },
  exportShareButton: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  exportShareButtonDisabled: {
    opacity: 0.7,
  },
  exportShareButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  reportRangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reportRangeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  reportRangeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  reportRangeLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  reportRangeValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  reportRangeValueActive: {
    color: '#1D4ED8',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  calendarMonthLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarWeekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarWeekHeaderText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 6,
  },
  calendarDayEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDayInRange: {
    backgroundColor: '#DBEAFE',
  },
  calendarDaySelected: {
    backgroundColor: '#2563EB',
  },
  calendarDayText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
  calendarDayTextInRange: {
    color: '#1D4ED8',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reportModalInfoText: {
    color: '#334155',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  reportModalErrorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});
