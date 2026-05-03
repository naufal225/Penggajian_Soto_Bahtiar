import { useNetworkState } from 'expo-network';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createDailyWage,
  getCurrentWeekPeriod,
  getDailyWagesByDate,
  getWeekPeriodDetail,
  payWeeklyAll,
  payWeeklyEmployee,
  updateDailyWage,
} from '@/services/api/wage-api';
import { ApiClientError } from '@/services/api/http-client';
import { loadWageReportData } from '@/services/report/wage-report-data-service';
import { generateWeeklyWageReportPdf, isPdfSharingAvailable, sharePdfFile } from '@/services/report/wage-pdf-service';
import {
  cacheCurrentWeekDetail,
  cacheDailyWagesByDate,
  clearDraftsByDate,
  deleteDraft,
  enqueueSyncChange,
  getFallbackOfflineWageSnapshot,
  getCachedWageSnapshot,
  getDraftsByDate,
  getSyncOverview,
  getSyncQueueStateByEmployee,
  saveOfflineDailyWage,
  saveOfflineWeeklyPayment,
  setLastViewedWageDate,
  upsertDraft,
} from '@/services/sqlite/wage-offline-store';
import { subscribeSyncEvents, syncPendingChanges } from '@/services/sync/mobile-sync-service';
import type { WageSyncState, WeekPeriodDetailResponse } from '@/types/wage';

interface UseWageHomeViewModelOptions {
  onUnauthorized: () => void;
}

interface WageRowBase {
  employeeId: number;
  employeeName: string;
  dailyWageId: number | null;
  dailyAmount: number | null;
  dailyNotes: string;
  hasDailyRecord: boolean;
  todayRecordLocked: boolean;
  weekPaymentStatus: 'paid' | 'unpaid';
  weekTotalAmount: number;
  weekPaidAmount: number;
  weekUnpaidAmount: number;
  filledDays: number;
  unpaidDays: number;
  canPayNow: boolean;
}

interface WageDraft {
  amountInput: string;
  notesInput: string;
}

interface WageSyncStateItem {
  state: WageSyncState;
  message: string;
}

export interface WageEmployeeRow {
  employeeId: number;
  employeeName: string;
  dailyWageId: number | null;
  amountInput: string;
  notesInput: string;
  currentAmount: number;
  isLocked: boolean;
  weekPaymentStatus: 'paid' | 'unpaid';
  weekTotalAmount: number;
  weekPaidAmount: number;
  weekUnpaidAmount: number;
  filledDays: number;
  unpaidDays: number;
  hasDailyRecord: boolean;
  hasUnsavedChange: boolean;
  syncState: WageSyncState;
  syncMessage: string;
  paymentStatusLabel: 'Belum Digaji' | 'Belum Dibayar' | 'Sudah Dibayar';
  canPayNow: boolean;
}

export type WageActionModal =
  | { type: 'pay_employee'; employeeId: number; employeeName: string }
  | { type: 'pay_all' }
  | { type: 'discard_changes'; targetDate: string }
  | null;

function getTodayDateLocal(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function toDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function listDatesInclusive(startDate: string, endDate: string): string[] {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [startDate];
  }

  const result: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    result.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function mapGlobalErrorMessage(error: ApiClientError): string {
  if (error.code === 'UNAUTHORIZED') {
    return 'Sesi login berakhir';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Belum ada data tersimpan di HP';
  }

  return 'Terjadi masalah, coba lagi';
}

function mapRowSyncFailure(error: ApiClientError): WageSyncStateItem {
  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return {
      state: 'pending',
      message: 'Tersimpan di HP',
    };
  }

  if (
    error.code === 'DAILY_WAGE_LOCKED' ||
    error.code === 'FORBIDDEN_ACTION' ||
    error.code === 'PAYMENT_ALREADY_COMPLETED' ||
    error.code === 'WEEK_ALREADY_FULLY_PAID'
  ) {
    return {
      state: 'conflict',
      message: 'Terjadi masalah',
    };
  }

  return {
    state: 'failed',
    message: 'Terjadi masalah',
  };
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeWeekPaymentStatus(value: unknown): 'paid' | 'unpaid' {
  return value === 'paid' ? 'paid' : 'unpaid';
}

function syncStateFromResult(status: 'success' | 'failed' | 'conflict'): WageSyncStateItem {
  if (status === 'success') {
    return { state: 'synced', message: 'Sinkron berhasil' };
  }

  if (status === 'conflict') {
    return { state: 'conflict', message: 'Terjadi masalah' };
  }

  return { state: 'failed', message: 'Belum terkirim' };
}

function syncStateFromQueue(status: WageSyncState): WageSyncStateItem {
  if (status === 'pending') {
    return { state: 'pending', message: 'Belum terkirim' };
  }

  if (status === 'conflict') {
    return { state: 'conflict', message: 'Terjadi masalah' };
  }

  if (status === 'failed') {
    return { state: 'failed', message: 'Belum terkirim' };
  }

  return { state: 'synced', message: 'Sinkron berhasil' };
}

function buildBaseRows(detail: WeekPeriodDetailResponse, employees: Array<{
  employee_id: number;
  employee_name: string;
  daily_wage: { id: number; amount: number; notes: string | null; is_locked: boolean } | null;
}>): WageRowBase[] {
  const weekEmployeeMap = new Map(detail.employees.map((employee) => [employee.employee_id, employee]));

  return employees.map((employee) => {
    const weekEmployee = weekEmployeeMap.get(employee.employee_id);
    const dailyWage = employee.daily_wage;
    const hasDailyRecord = dailyWage !== null;
    const normalizedDailyWageId = dailyWage && dailyWage.id > 0 ? dailyWage.id : null;
    const weekPaymentStatus = normalizeWeekPaymentStatus(weekEmployee?.payment_status);

    return {
      employeeId: employee.employee_id,
      employeeName: employee.employee_name,
      dailyWageId: normalizedDailyWageId,
      dailyAmount: dailyWage?.amount ?? null,
      dailyNotes: dailyWage?.notes ?? '',
      hasDailyRecord,
      todayRecordLocked: dailyWage?.is_locked ?? false,
      weekPaymentStatus,
      weekTotalAmount: weekEmployee?.total_amount ?? 0,
      weekPaidAmount: weekEmployee?.paid_amount ?? 0,
      weekUnpaidAmount: weekEmployee?.unpaid_amount ?? 0,
      filledDays: weekEmployee?.filled_days ?? 0,
      unpaidDays: weekEmployee?.unpaid_days ?? 0,
      canPayNow: weekEmployee?.can_pay_now ?? false,
    };
  });
}

export function useWageHomeViewModel({ onUnauthorized }: UseWageHomeViewModelOptions) {
  const networkState = useNetworkState();
  const [selectedDate, setSelectedDate] = useState(getTodayDateLocal);
  const [weekDetail, setWeekDetail] = useState<WeekPeriodDetailResponse | null>(null);
  const [baseRows, setBaseRows] = useState<WageRowBase[]>([]);
  const [draftMap, setDraftMap] = useState<Record<number, WageDraft>>({});
  const [syncStatusPerRow, setSyncStatusPerRow] = useState<Record<number, WageSyncStateItem>>({});
  const [pendingActions, setPendingActions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharingExport, setSharingExport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [lastExportedFileUri, setLastExportedFileUri] = useState<string | null>(null);
  const [lastExportedFileName, setLastExportedFileName] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [modal, setModal] = useState<WageActionModal>(null);

  const isOffline = !(networkState.isConnected ?? false) || !(networkState.isInternetReachable ?? networkState.isConnected ?? false);

  const applyLoadedData = useCallback((date: string, nextWeekDetail: WeekPeriodDetailResponse, rows: WageRowBase[]) => {
    setSelectedDate(date);
    setWeekDetail(nextWeekDetail);
    setBaseRows(rows);
    setError(null);
  }, []);

  const refreshSyncOverview = useCallback(async () => {
    const overview = await getSyncOverview();
    setPendingSyncCount(overview.pendingSyncCount);
  }, []);

  const hydrateFromCache = useCallback(
    async (date: string) => {
      const cached = await getCachedWageSnapshot(date);
      const fallbackCached = cached ?? (await getFallbackOfflineWageSnapshot(date));
      if (!fallbackCached) {
        return false;
      }

      const localDrafts = await getDraftsByDate(date);
      const queueStates = await getSyncQueueStateByEmployee(date, fallbackCached.weekDetail.id || null);
      const nextDraftMap: Record<number, WageDraft> = {};
      Object.values(localDrafts).forEach((draft) => {
        nextDraftMap[draft.employeeId] = {
          amountInput: draft.amountInput,
          notesInput: draft.notesInput,
        };
      });

      const nextSyncState: Record<number, WageSyncStateItem> = {};
      Object.entries(queueStates).forEach(([employeeId, status]) => {
        nextSyncState[Number(employeeId)] = syncStateFromQueue(status);
      });

      setDraftMap(nextDraftMap);
      setSyncStatusPerRow(nextSyncState);
      applyLoadedData(date, fallbackCached.weekDetail, buildBaseRows(fallbackCached.weekDetail, fallbackCached.data.employees));
      setInfoMessage('Menampilkan data tersimpan di HP');
      await setLastViewedWageDate(date);
      return true;
    },
    [applyLoadedData]
  );

  const loadData = useCallback(
    async (date: string, mode: 'initial' | 'refresh', options?: { skipSync?: boolean; silent?: boolean }) => {
      if (mode === 'initial' && !options?.silent) {
        setLoading(true);
      } else if (mode === 'refresh' && !options?.silent) {
        setRefreshing(true);
      }

      const hasCachedData = await hydrateFromCache(date);
      if (hasCachedData && mode === 'initial' && !options?.silent) {
        setLoading(false);
      }

      try {
        if (!options?.skipSync) {
          try {
            await syncPendingChanges('wage_load', { onUnauthorized });
          } catch (syncError) {
            const syncClientError =
              syncError instanceof ApiClientError
                ? syncError
                : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
            if (syncClientError.code === 'UNAUTHORIZED') {
              onUnauthorized();
              return;
            }
          }
        }

        const dailyWageResponse = await getDailyWagesByDate(date);
        const currentWeek = await getCurrentWeekPeriod();
        const detail = await getWeekPeriodDetail(currentWeek.id);
        await cacheCurrentWeekDetail(detail);
        await cacheDailyWagesByDate(dailyWageResponse);
        const localDrafts = await getDraftsByDate(date);
        const queueStates = await getSyncQueueStateByEmployee(date, detail.id);
        const rows = buildBaseRows(detail, dailyWageResponse.employees);

        const nextDraftMap: Record<number, WageDraft> = {};
        Object.values(localDrafts).forEach((draft) => {
          nextDraftMap[draft.employeeId] = {
            amountInput: draft.amountInput,
            notesInput: draft.notesInput,
          };
        });

        const nextSyncState: Record<number, WageSyncStateItem> = {};
        Object.entries(queueStates).forEach(([employeeId, status]) => {
          nextSyncState[Number(employeeId)] = syncStateFromQueue(status);
        });

        setDraftMap(nextDraftMap);
        setSyncStatusPerRow(nextSyncState);
        applyLoadedData(date, detail, rows);
        setInfoMessage(null);
        await setLastViewedWageDate(date);
      } catch (rawError) {
        const normalizedError = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

        if (normalizedError.code === 'UNAUTHORIZED') {
          onUnauthorized();
          return;
        }

        if (!hasCachedData) {
          setError(mapGlobalErrorMessage(normalizedError));
          setInfoMessage(null);
        } else {
          setError(null);
          setInfoMessage('Menampilkan data tersimpan di HP');
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
          setRefreshing(false);
        }
        await refreshSyncOverview();
      }
    },
    [applyLoadedData, hydrateFromCache, onUnauthorized, refreshSyncOverview]
  );

  useEffect(() => {
    void loadData(selectedDate, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

  useEffect(() => {
    return subscribeSyncEvents((payload) => {
      setPendingSyncCount(payload.pendingSyncCount);

      if (payload.resolvedItems.length === 0) {
        return;
      }

      const nextSyncState: Record<number, WageSyncStateItem> = {};
      payload.resolvedItems.forEach(({ queueItem, result }) => {
        if (queueItem.employeeId === null) {
          return;
        }

        nextSyncState[queueItem.employeeId] = syncStateFromResult(result.status);
      });

      setSyncStatusPerRow((previous) => ({
        ...previous,
        ...nextSyncState,
      }));

      void loadData(selectedDate, 'refresh', {
        skipSync: true,
        silent: true,
      });
    });
  }, [loadData, selectedDate]);

  const employeeRows = useMemo<WageEmployeeRow[]>(() => {
    return baseRows.map((baseRow) => {
      const draft = draftMap[baseRow.employeeId];
      const syncState = syncStatusPerRow[baseRow.employeeId];
      const amountInput = draft?.amountInput ?? (baseRow.dailyAmount !== null ? String(baseRow.dailyAmount) : '');
      const notesInput = draft?.notesInput ?? baseRow.dailyNotes;
        const hasUnsavedChange = !!draft;
        const isLocked = baseRow.todayRecordLocked;
        const normalizedAmountInput = amountInput.trim();
        const currentAmount = normalizedAmountInput === '' ? 0 : Number(normalizedAmountInput);
        const paymentStatusLabel: WageEmployeeRow['paymentStatusLabel'] = isLocked
          ? 'Sudah Dibayar'
          : baseRow.hasDailyRecord
            ? 'Belum Dibayar'
            : 'Belum Digaji';
      const row: WageEmployeeRow = {
        employeeId: baseRow.employeeId,
        employeeName: baseRow.employeeName,
        dailyWageId: baseRow.dailyWageId,
        amountInput,
        notesInput,
        currentAmount,
        isLocked,
        weekPaymentStatus: baseRow.weekPaymentStatus,
        weekTotalAmount: baseRow.weekTotalAmount,
        weekPaidAmount: baseRow.weekPaidAmount,
        weekUnpaidAmount: baseRow.weekUnpaidAmount,
        filledDays: baseRow.filledDays,
        unpaidDays: baseRow.unpaidDays,
        hasDailyRecord: baseRow.hasDailyRecord,
        hasUnsavedChange,
        syncState: syncState?.state ?? (hasUnsavedChange ? 'pending' : 'synced'),
        syncMessage: syncState?.message ?? (hasUnsavedChange ? 'Belum terkirim' : 'Sinkron berhasil'),
        paymentStatusLabel,
        canPayNow: baseRow.canPayNow,
      };
      return row;
    });
  }, [baseRows, draftMap, syncStatusPerRow]);

  const hasDraftChanges = useMemo(() => Object.keys(draftMap).length > 0, [draftMap]);
  const changedCount = useMemo(() => Object.keys(draftMap).length, [draftMap]);
  const selectedDateTotal = useMemo(() => {
    return baseRows.reduce((total, baseRow) => {
      const draft = draftMap[baseRow.employeeId];
      if (draft) {
        const normalizedAmount = draft.amountInput.trim();
        return total + (normalizedAmount === '' ? 0 : Number(normalizedAmount));
      }

      return total + (baseRow.dailyAmount ?? 0);
    }, 0);
  }, [baseRows, draftMap]);
  const unpaidCount = useMemo(() => employeeRows.filter((row) => row.weekUnpaidAmount > 0).length, [employeeRows]);
  const canPayAll = useMemo(() => unpaidCount > 0 && !paymentActionLoading, [paymentActionLoading, unpaidCount]);

  const weekDates = useMemo(() => {
    if (!weekDetail) {
      return [selectedDate];
    }

    return listDatesInclusive(weekDetail.start_date, weekDetail.end_date);
  }, [selectedDate, weekDetail]);

  const updateDraft = useCallback(
    (employeeId: number, patch: Partial<WageDraft>) => {
      setDraftMap((previous) => {
        const baseRow = baseRows.find((row) => row.employeeId === employeeId);
        if (!baseRow) {
          return previous;
        }

        const currentDraft = previous[employeeId] ?? {
          amountInput: baseRow.dailyAmount !== null ? String(baseRow.dailyAmount) : '',
          notesInput: baseRow.dailyNotes,
        };

        const nextDraft: WageDraft = {
          amountInput: patch.amountInput ?? currentDraft.amountInput,
          notesInput: patch.notesInput ?? currentDraft.notesInput,
        };

        const baseAmount = baseRow.dailyAmount !== null ? String(baseRow.dailyAmount) : '';
        const baseNotes = baseRow.dailyNotes;

        if (nextDraft.amountInput === baseAmount && nextDraft.notesInput === baseNotes) {
          const clone = { ...previous };
          delete clone[employeeId];
          void deleteDraft(selectedDate, employeeId);
          return clone;
        }

        void upsertDraft(selectedDate, employeeId, nextDraft.amountInput, nextDraft.notesInput);

        return {
          ...previous,
          [employeeId]: nextDraft,
        };
      });
    },
    [baseRows, selectedDate]
  );

  const setAmountInput = useCallback(
    (employeeId: number, value: string) => {
      updateDraft(employeeId, { amountInput: normalizeDigits(value) });
      setSyncStatusPerRow((previous) => {
        const clone = { ...previous };
        delete clone[employeeId];
        return clone;
      });
    },
    [updateDraft]
  );

  const setNotesInput = useCallback(
    (employeeId: number, value: string) => {
      updateDraft(employeeId, { notesInput: value });
      setSyncStatusPerRow((previous) => {
        const clone = { ...previous };
        delete clone[employeeId];
        return clone;
      });
    },
    [updateDraft]
  );

  const applyPresetAmount = useCallback(
    (employeeId: number, amount: number) => {
      updateDraft(employeeId, { amountInput: String(amount) });
      setSyncStatusPerRow((previous) => {
        const clone = { ...previous };
        delete clone[employeeId];
        return clone;
      });
    },
    [updateDraft]
  );

  const clearDraftAndStatus = useCallback(
    (employeeId: number) => {
      setDraftMap((previous) => {
        const clone = { ...previous };
        delete clone[employeeId];
        return clone;
      });
      void deleteDraft(selectedDate, employeeId);
      setSyncStatusPerRow((previous) => {
        const clone = { ...previous };
        delete clone[employeeId];
        return clone;
      });
    },
    [selectedDate]
  );

  const saveAllChanges = useCallback(async () => {
    if (submitting) {
      return;
    }

    const changedRows = employeeRows.filter((row) => row.hasUnsavedChange && !row.isLocked);
    if (changedRows.length === 0) {
      return;
    }

    setSubmitting(true);
    setPendingActions(changedRows.map((row) => row.employeeId));

    for (const row of changedRows) {
      const normalizedAmountInput = row.amountInput.trim();
      if (normalizedAmountInput === '') {
        setSyncStatusPerRow((previous) => ({
          ...previous,
          [row.employeeId]: {
            state: 'failed',
            message: 'Nominal wajib diisi',
          },
        }));

        continue;
      }

      const amount = Number(normalizedAmountInput);
      const notes = row.notesInput.trim() === '' ? null : row.notesInput.trim();

      try {
        if (row.dailyWageId === null) {
          await createDailyWage({
            employee_id: row.employeeId,
            wage_date: selectedDate,
            amount,
            notes,
          });
        } else {
          await updateDailyWage(row.dailyWageId, {
            amount,
            notes,
          });
        }

        clearDraftAndStatus(row.employeeId);
        setSyncStatusPerRow((previous) => ({
          ...previous,
          [row.employeeId]: {
            state: 'synced',
            message: 'Sinkron berhasil',
          },
        }));
        } catch (rawError) {
          const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

        if (error.code === 'UNAUTHORIZED') {
          onUnauthorized();
          setSubmitting(false);
          setPendingActions([]);
          return;
        }

        if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
          const localId = await enqueueSyncChange({
            entity: 'daily_wage',
            action: row.dailyWageId === null ? 'create' : 'update',
            serverId: row.dailyWageId,
            employeeId: row.employeeId,
            relatedDate: selectedDate,
            weekPeriodId: weekDetail && weekDetail.id > 0 ? weekDetail.id : null,
            payload: {
              employee_id: row.employeeId,
              wage_date: selectedDate,
              amount,
              notes,
            },
          });

          if (weekDetail) {
            await saveOfflineDailyWage({
              weekPeriodId: weekDetail.id,
              date: selectedDate,
              employeeId: row.employeeId,
              employeeName: row.employeeName,
              dailyWageId: row.dailyWageId,
              amount,
              notes,
              clientUuid: localId,
            });
          }

          clearDraftAndStatus(row.employeeId);
          setSyncStatusPerRow((previous) => ({
            ...previous,
            [row.employeeId]: {
              state: 'pending',
              message: 'Tersimpan di HP',
            },
          }));
          await refreshSyncOverview();
          continue;
        }

        const failure = mapRowSyncFailure(error);
        setSyncStatusPerRow((previous) => ({
          ...previous,
          [row.employeeId]: failure,
        }));
      }
    }

    setSubmitting(false);
    setPendingActions([]);

    try {
      await loadData(selectedDate, 'refresh');
    } catch {
      // jika masih offline, data lokal tetap terlihat
    }
  }, [clearDraftAndStatus, employeeRows, loadData, onUnauthorized, refreshSyncOverview, selectedDate, submitting, weekDetail]);

  const requestDateChange = useCallback(
    (nextDate: string) => {
      if (nextDate === selectedDate) {
        return;
      }

      if (submitting || paymentActionLoading) {
        return;
      }

      if (hasDraftChanges) {
        setModal({
          type: 'discard_changes',
          targetDate: nextDate,
        });
        return;
      }

      setDraftMap({});
      void loadData(nextDate, 'refresh');
    },
    [hasDraftChanges, loadData, paymentActionLoading, selectedDate, submitting]
  );

  const cancelModal = useCallback(() => {
    if (paymentActionLoading) {
      return;
    }

    setModal(null);
  }, [paymentActionLoading]);

  const confirmDiscardAndChangeDate = useCallback(async () => {
    if (!modal || modal.type !== 'discard_changes') {
      return;
    }

    const targetDate = modal.targetDate;
    setModal(null);
    await clearDraftsByDate(selectedDate);
    setDraftMap({});
    await loadData(targetDate, 'refresh');
  }, [loadData, modal, selectedDate]);

  const openPayEmployeeModal = useCallback((employeeId: number, employeeName: string) => {
    setModal({
      type: 'pay_employee',
      employeeId,
      employeeName,
    });
  }, []);

  const openPayAllModal = useCallback(() => {
    setModal({ type: 'pay_all' });
  }, []);

  const confirmPayment = useCallback(async () => {
    if (!weekDetail || !modal) {
      return;
    }

    setPaymentActionLoading(true);

    try {
      if (modal.type === 'pay_employee') {
        await payWeeklyEmployee({
          week_period_id: weekDetail.id,
          employee_id: modal.employeeId,
          notes: null,
        });
      }

      if (modal.type === 'pay_all') {
        await payWeeklyAll({
          week_period_id: weekDetail.id,
          notes: null,
        });
      }

      setModal(null);
      await loadData(selectedDate, 'refresh');
    } catch (rawError) {
      const errorObject = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

      if (errorObject.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

        if (errorObject.code === 'NETWORK_ERROR' || errorObject.code === 'REQUEST_TIMEOUT') {
          if (modal.type === 'pay_employee') {
            await enqueueSyncChange({
              entity: 'weekly_payment',
              action: 'pay_employee',
              employeeId: modal.employeeId,
              weekPeriodId: weekDetail.id,
              payload: {
                week_period_id: weekDetail.id,
                employee_id: modal.employeeId,
                notes: null,
              },
            });

            await saveOfflineWeeklyPayment({
              weekPeriodId: weekDetail.id,
              employeeId: modal.employeeId,
              paymentScope: 'employee',
            });

            setSyncStatusPerRow((previous) => ({
              ...previous,
              [modal.employeeId]: {
                state: 'pending',
                message: 'Tersimpan di HP',
              },
            }));
          }

          if (modal.type === 'pay_all') {
            await enqueueSyncChange({
              entity: 'weekly_payment',
              action: 'pay_all',
              weekPeriodId: weekDetail.id,
              payload: {
                week_period_id: weekDetail.id,
                notes: null,
              },
            });

            await saveOfflineWeeklyPayment({
              weekPeriodId: weekDetail.id,
              paymentScope: 'all',
            });

            const next: Record<number, WageSyncStateItem> = {};
            employeeRows.forEach((row) => {
              if (row.weekUnpaidAmount > 0) {
                next[row.employeeId] = { state: 'pending', message: 'Tersimpan di HP' };
              }
            });
            setSyncStatusPerRow((previous) => ({ ...previous, ...next }));
          }

          setModal(null);
          setError(null);
          setInfoMessage('Perubahan tersimpan di HP');
          await refreshSyncOverview();
          await loadData(selectedDate, 'refresh', {
            skipSync: true,
            silent: true,
          });
          return;
        }

      setError(mapGlobalErrorMessage(errorObject));
    } finally {
      setPaymentActionLoading(false);
    }
  }, [employeeRows, loadData, modal, onUnauthorized, selectedDate, weekDetail]);

  const exportPdf = useCallback(async (startDate: string, endDate: string) => {
    if (exporting) {
      return;
    }

    if (hasDraftChanges) {
      setExportMessage('Simpan perubahan dulu sebelum export PDF');
      setError(null);
      return;
    }

    setExporting(true);
    setError(null);
    setExportMessage(null);

    try {
      const report = await loadWageReportData(startDate, endDate);
      if (report.rows.length === 0) {
        setExportMessage('Belum ada data gaji pada rentang tanggal ini');
        return;
      }

      const result = await generateWeeklyWageReportPdf({
        businessName: 'Soto Bahtiar',
        report,
      });
      setLastExportedFileUri(result.fileUri);
      setLastExportedFileName(result.fileName);
      setExportMessage(result.savedToDownloads ? `PDF tersimpan di folder Download: ${result.fileName}` : `PDF tersimpan di HP: ${result.fileName}`);
    } catch (rawError) {
      const errorObject = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

      if (errorObject.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return;
      }

      if (rawError instanceof Error && rawError.message === 'DOWNLOAD_DIRECTORY_REQUIRED') {
        setError('Pilih folder Download untuk menyimpan PDF');
        return;
      }

      setError('PDF belum berhasil dibuat');
    } finally {
      setExporting(false);
    }
  }, [exporting, hasDraftChanges, onUnauthorized]);

  const shareLastExportedPdf = useCallback(async () => {
    if (!lastExportedFileUri || sharingExport) {
      return;
    }

    setSharingExport(true);
    setError(null);

    try {
      const canShare = await isPdfSharingAvailable();
      if (!canShare) {
        setExportMessage('PDF sudah tersimpan di HP');
        return;
      }

      await sharePdfFile(lastExportedFileUri);
    } catch {
      setError('PDF belum berhasil dibagikan');
    } finally {
      setSharingExport(false);
    }
  }, [lastExportedFileUri, sharingExport]);

  const clearExportFeedback = useCallback(() => {
    setExportMessage(null);
    setLastExportedFileName(null);
    setLastExportedFileUri(null);
  }, []);

  const retry = useCallback(() => {
    void loadData(selectedDate, 'initial');
  }, [loadData, selectedDate]);

  const refresh = useCallback(() => {
    void loadData(selectedDate, 'refresh');
  }, [loadData, selectedDate]);

  return {
    loading,
    refreshing,
    submitting,
    paymentActionLoading,
    exporting,
    sharingExport,
    error,
    infoMessage,
    exportMessage,
    lastExportedFileName,
    clearExportFeedback,
    pendingSyncCount,
    isOffline,
    selectedDate,
    weekInfo: weekDetail,
    weekDates,
    employeeRows,
    draftMap,
    pendingActions,
    syncStatusPerRow,
    changedCount,
    selectedDateTotal,
    unpaidCount,
    canPayAll,
    hasDraftChanges,
    modal,
    setAmountInput,
    setNotesInput,
    applyPresetAmount,
    requestDateChange,
    openPayEmployeeModal,
    openPayAllModal,
    cancelModal,
    confirmPayment,
    confirmDiscardAndChangeDate,
    saveAllChanges,
    exportPdf,
    shareLastExportedPdf,
    retry,
    refresh,
  };
}
