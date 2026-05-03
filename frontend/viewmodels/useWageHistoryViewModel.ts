import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getWeekPeriodList,
  getWeeklyPaymentHistoryCards,
  undoWeeklyPayment,
} from '@/services/api/wage-api';
import { ApiClientError } from '@/services/api/http-client';
import {
  cacheWeekPeriods,
  cacheWeeklyPaymentHistoryCards,
  enqueueSyncChange,
  getCachedWeekPeriods,
  getCachedWeeklyPaymentHistoryCards,
  saveOfflineUndoPayment,
} from '@/services/sqlite/wage-offline-store';
import { subscribeSyncEvents, syncPendingChanges } from '@/services/sync/mobile-sync-service';
import type { WeekPeriodListItem, WeeklyPaymentHistoryCard } from '@/types/wage';

interface UseWageHistoryViewModelOptions {
  initialWeekPeriodId: number | null;
  onUnauthorized: () => void;
}

interface CachedResult<TItem> {
  items: TItem[];
  usedCache: boolean;
  missingCache: boolean;
}

function mapGlobalErrorMessage(error: ApiClientError): string {
  if (error.code === 'UNAUTHORIZED') {
    return 'Sesi login berakhir';
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Tidak bisa terhubung ke server';
  }

  return 'Terjadi masalah, coba lagi';
}

async function fetchWeekPeriods(): Promise<CachedResult<WeekPeriodListItem>> {
  try {
    try {
      await syncPendingChanges('history_load');
    } catch {
      // cache tetap boleh dipakai
    }

    const response = await getWeekPeriodList(1, 12);
    await cacheWeekPeriods(response.items);

    return {
      items: response.items,
      usedCache: false,
      missingCache: false,
    };
  } catch (rawError) {
    const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
    if (error.code === 'UNAUTHORIZED') {
      throw error;
    }

    if (error.code !== 'NETWORK_ERROR' && error.code !== 'REQUEST_TIMEOUT') {
      throw error;
    }

    const cachedItems = await getCachedWeekPeriods(12);

    return {
      items: cachedItems,
      usedCache: cachedItems.length > 0,
      missingCache: cachedItems.length === 0,
    };
  }
}

async function fetchHistoryCards(weekPeriodId: number): Promise<CachedResult<WeeklyPaymentHistoryCard>> {
  try {
    const response = await getWeeklyPaymentHistoryCards(weekPeriodId, 1, 20);
    await cacheWeeklyPaymentHistoryCards(weekPeriodId, response.items);

    return {
      items: response.items,
      usedCache: false,
      missingCache: false,
    };
  } catch (rawError) {
    const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
    if (error.code === 'UNAUTHORIZED') {
      throw error;
    }

    if (error.code !== 'NETWORK_ERROR' && error.code !== 'REQUEST_TIMEOUT') {
      throw error;
    }

    const cachedItems = await getCachedWeeklyPaymentHistoryCards(weekPeriodId);

    return {
      items: cachedItems,
      usedCache: cachedItems.length > 0,
      missingCache: cachedItems.length === 0,
    };
  }
}

export function useWageHistoryViewModel({
  initialWeekPeriodId,
  onUnauthorized,
}: UseWageHistoryViewModelOptions) {
  const [weekPeriods, setWeekPeriods] = useState<WeekPeriodListItem[]>([]);
  const [selectedWeekPeriodId, setSelectedWeekPeriodId] = useState<number | null>(initialWeekPeriodId);
  const [historyCards, setHistoryCards] = useState<WeeklyPaymentHistoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [undoingPaymentId, setUndoingPaymentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const selectedWeek = useMemo(
    () => weekPeriods.find((item) => item.id === selectedWeekPeriodId) ?? null,
    [selectedWeekPeriodId, weekPeriods]
  );

  const loadHistoryForWeek = useCallback(
    async (weekPeriodId: number, mode: 'initial' | 'refresh' | 'switch') => {
      if (mode === 'switch') {
        setHistoryLoading(true);
      }

      try {
        const cardResult = await fetchHistoryCards(weekPeriodId);
        setHistoryCards(cardResult.items);
        setError(null);

        if (cardResult.usedCache) {
          setInfoMessage('Menampilkan data yang tersimpan di HP');
        } else if (cardResult.missingCache) {
          setInfoMessage('Belum ada data tersimpan di HP untuk periode ini');
        } else {
          setInfoMessage(null);
        }
      } catch (rawError) {
        const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
        if (error.code === 'UNAUTHORIZED') {
          onUnauthorized();
          return;
        }

        setHistoryCards([]);
        setError(mapGlobalErrorMessage(error));
      } finally {
        setHistoryLoading(false);
      }
    },
    [onUnauthorized]
  );

  const loadData = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const weekResult = await fetchWeekPeriods();
        setWeekPeriods(weekResult.items);

        const nextSelectedWeekId =
          weekResult.items.find((item) => item.id === selectedWeekPeriodId)?.id ??
          weekResult.items.find((item) => item.id === initialWeekPeriodId)?.id ??
          weekResult.items[0]?.id ??
          null;

        setSelectedWeekPeriodId(nextSelectedWeekId);
        setError(null);

        if (nextSelectedWeekId === null) {
          setHistoryCards([]);
          setInfoMessage(weekResult.usedCache ? 'Menampilkan data yang tersimpan di HP' : null);
          return;
        }

        const cardResult = await fetchHistoryCards(nextSelectedWeekId);
        setHistoryCards(cardResult.items);

        if (weekResult.usedCache || cardResult.usedCache) {
          setInfoMessage('Menampilkan data yang tersimpan di HP');
        } else if (weekResult.missingCache || cardResult.missingCache) {
          setInfoMessage('Belum ada data tersimpan di HP untuk periode ini');
        } else {
          setInfoMessage(null);
        }
      } catch (rawError) {
        const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
        if (error.code === 'UNAUTHORIZED') {
          onUnauthorized();
          return;
        }

        setError(mapGlobalErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [initialWeekPeriodId, onUnauthorized, selectedWeekPeriodId]
  );

  useEffect(() => {
    void loadData('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return subscribeSyncEvents((payload) => {
      if (payload.resolvedItems.length > 0) {
        void loadData('refresh');
      }
    });
  }, [loadData]);

  const selectWeekPeriod = useCallback(
    async (weekPeriodId: number) => {
      if (weekPeriodId === selectedWeekPeriodId) {
        return;
      }

      setSelectedWeekPeriodId(weekPeriodId);
      setError(null);
      await loadHistoryForWeek(weekPeriodId, 'switch');
    },
    [loadHistoryForWeek, selectedWeekPeriodId]
  );

  const refreshData = useCallback(() => {
    void loadData('refresh');
  }, [loadData]);

  const retry = useCallback(() => {
    void loadData('initial');
  }, [loadData]);

  const undoPayment = useCallback(
    async (paymentId: number) => {
      if (undoingPaymentId !== null || selectedWeekPeriodId === null) {
        return;
      }

      setUndoingPaymentId(paymentId);

      try {
        await undoWeeklyPayment(paymentId, 'Perbaikan catatan pembayaran');
        await loadData('refresh');
      } catch (rawError) {
        const error = rawError instanceof ApiClientError ? rawError : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

        if (error.code === 'UNAUTHORIZED') {
          onUnauthorized();
          return;
        }

        if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
          await enqueueSyncChange({
            entity: 'weekly_payment',
            action: 'undo',
            serverId: paymentId,
            payload: {
              payment_id: paymentId,
              reason: 'Perbaikan catatan pembayaran',
            },
          });

          await saveOfflineUndoPayment(paymentId);
          const nextCards = await getCachedWeeklyPaymentHistoryCards(selectedWeekPeriodId);
          setHistoryCards(nextCards);
          setError(null);
          setInfoMessage('Perubahan tersimpan di HP');
          return;
        }

        setError(mapGlobalErrorMessage(error));
      } finally {
        setUndoingPaymentId(null);
      }
    },
    [historyCards, loadData, onUnauthorized, selectedWeekPeriodId, undoingPaymentId]
  );

  return {
    loading,
    refreshing,
    historyLoading,
    undoingPaymentId,
    error,
    infoMessage,
    weekPeriods,
    selectedWeek,
    selectedWeekPeriodId,
    historyCards,
    selectWeekPeriod,
    refreshData,
    retry,
    undoPayment,
  };
}
