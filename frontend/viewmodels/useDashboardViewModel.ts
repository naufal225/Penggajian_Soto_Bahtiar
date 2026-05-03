import { useNetworkState } from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDashboardSummary } from '@/services/api/dashboard-api';
import { ApiClientError } from '@/services/api/http-client';
import { getCachedDashboardSummary, cacheDashboardSummary } from '@/services/sqlite/dashboard-cache';
import { getSyncOverview } from '@/services/sqlite/wage-offline-store';
import { subscribeSyncEvents, syncPendingChanges } from '@/services/sync/mobile-sync-service';
import type { DashboardSummary } from '@/types/dashboard';

interface UseDashboardViewModelOptions {
  onUnauthorized: () => void;
}

function normalizeError(rawError: unknown): ApiClientError {
  if (rawError instanceof ApiClientError) {
    return rawError;
  }

  return new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
}

function mapErrorMessage(error: ApiClientError): string {
  if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'Belum ada data tersimpan di HP';
  }

  return 'Terjadi masalah, coba lagi';
}

export function useDashboardViewModel({ onUnauthorized }: UseDashboardViewModelOptions) {
  const networkState = useNetworkState();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const hasDataRef = useRef(false);

  const isOffline = !(networkState.isConnected ?? false) || !(networkState.isInternetReachable ?? networkState.isConnected ?? false);

  const refreshSyncOverview = useCallback(async () => {
    const overview = await getSyncOverview();
    setPendingSyncCount(overview.pendingSyncCount);
  }, []);

  useEffect(() => {
    hasDataRef.current = data !== null;
  }, [data]);

  const fetchRemoteDashboard = useCallback(
    async (options: { mode: 'initial' | 'refresh'; silent?: boolean; skipSync?: boolean }) => {
      if (options.mode === 'initial' && !options.silent) {
        setLoading(true);
      } else if (options.mode === 'refresh' && !options.silent) {
        setRefreshing(true);
      }

      try {
        if (!options.skipSync) {
          try {
            await syncPendingChanges('dashboard_load', { onUnauthorized });
          } catch (syncError) {
            const syncClientError = normalizeError(syncError);
            if (syncClientError.code === 'UNAUTHORIZED') {
              onUnauthorized();
              return;
            }
          }
        }

        const summary = await getDashboardSummary();
        const cachedAt = await cacheDashboardSummary(summary);
        setData(summary);
        hasDataRef.current = true;
        setError(null);
        setInfoMessage(null);
        setLastUpdatedAt(cachedAt);
      } catch (rawError) {
        const errorObject = normalizeError(rawError);

        if (errorObject.code === 'UNAUTHORIZED') {
          onUnauthorized();
          return;
        }

        if (hasDataRef.current) {
          setError(null);
          setInfoMessage('Menampilkan data tersimpan di HP');
        } else {
          setError(mapErrorMessage(errorObject));
        }
      } finally {
        if (!options.silent) {
          setLoading(false);
          setRefreshing(false);
        }
        await refreshSyncOverview();
      }
    },
    [onUnauthorized, refreshSyncOverview]
  );

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const cached = await getCachedDashboardSummary();
      if (cached) {
        setData(cached.summary);
        hasDataRef.current = true;
        setLastUpdatedAt(cached.cachedAt);
        setInfoMessage(isOffline ? 'Menampilkan data tersimpan di HP' : null);
        setError(null);
        if (mode === 'initial') {
          setLoading(false);
        }
      }

      await fetchRemoteDashboard({
        mode,
        silent: mode === 'initial' && !!cached,
      });
    },
    [fetchRemoteDashboard, isOffline]
  );

  useEffect(() => {
    void loadDashboard('initial');
  }, [loadDashboard]);

  useEffect(() => {
    return subscribeSyncEvents((payload) => {
      setPendingSyncCount(payload.pendingSyncCount);
      if (payload.resolvedItems.length > 0) {
        void fetchRemoteDashboard({
          mode: 'refresh',
          skipSync: true,
          silent: true,
        });
      }
    });
  }, [fetchRemoteDashboard]);

  const retry = useCallback(() => {
    void loadDashboard('initial');
  }, [loadDashboard]);

  const refresh = useCallback(() => {
    void loadDashboard('refresh');
  }, [loadDashboard]);

  return {
    data,
    loading,
    refreshing,
    error,
    infoMessage,
    lastUpdatedAt,
    pendingSyncCount,
    isOffline,
    retry,
    refresh,
  };
}
