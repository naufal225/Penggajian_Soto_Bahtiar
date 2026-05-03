import { pushSyncChanges } from '@/services/api/wage-api';
import { ApiClientError } from '@/services/api/http-client';
import { getNetworkSnapshot, isNetworkAvailable } from '@/services/network/network-service';
import {
  applySyncResultToCache,
  getPendingSyncChanges,
  getSyncOverview,
  markSyncResult,
  setLastServerSyncAt,
  toSyncPushChange,
  type PendingSyncRecord,
} from '@/services/sqlite/wage-offline-store';
import { getAuthToken, getOrCreateDeviceId } from '@/services/storage/session-storage';
import type { SyncPushResultItem } from '@/types/wage';

export interface SyncResolvedItem {
  queueItem: PendingSyncRecord;
  result: SyncPushResultItem;
}

export interface SyncEventPayload {
  reason: string;
  pendingSyncCount: number;
  resolvedItems: SyncResolvedItem[];
}

type SyncListener = (payload: SyncEventPayload) => void;

const listeners = new Set<SyncListener>();

let currentSyncPromise: Promise<SyncEventPayload | null> | null = null;

function notifyListeners(payload: SyncEventPayload): void {
  listeners.forEach((listener) => {
    listener(payload);
  });
}

export function subscribeSyncEvents(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function syncPendingChanges(
  reason = 'manual',
  options?: { onUnauthorized?: () => void }
): Promise<SyncEventPayload | null> {
  if (currentSyncPromise) {
    return currentSyncPromise;
  }

  currentSyncPromise = (async () => {
    const token = await getAuthToken();
    if (!token) {
      return null;
    }

    const networkSnapshot = await getNetworkSnapshot().catch(() => ({
      isConnected: false,
      isInternetReachable: false,
    }));

    if (!isNetworkAvailable(networkSnapshot)) {
      return null;
    }

    const queue = await getPendingSyncChanges(100);
    if (queue.length === 0) {
      return {
        reason,
        pendingSyncCount: 0,
        resolvedItems: [],
      };
    }

    try {
      const deviceId = await getOrCreateDeviceId();
      const changes = queue.map((item) => toSyncPushChange(item));
      const pushResult = await pushSyncChanges(deviceId, changes);
      const queueMap = new Map(queue.map((item) => [item.clientUuid, item]));
      const resolvedItems: SyncResolvedItem[] = [];

      for (const result of pushResult.results) {
        await markSyncResult(result);

        if (!result.client_uuid) {
          continue;
        }

        const queueItem = queueMap.get(result.client_uuid);
        if (!queueItem) {
          continue;
        }

        await applySyncResultToCache(queueItem, result);
        resolvedItems.push({
          queueItem,
          result,
        });
      }

      await setLastServerSyncAt(new Date().toISOString());
      const overview = await getSyncOverview();
      const payload: SyncEventPayload = {
        reason,
        pendingSyncCount: overview.pendingSyncCount,
        resolvedItems,
      };
      notifyListeners(payload);
      return payload;
    } catch (rawError) {
      const error =
        rawError instanceof ApiClientError
          ? rawError
          : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');

      if (error.code === 'UNAUTHORIZED') {
        options?.onUnauthorized?.();
      }

      throw error;
    }
  })();

  try {
    return await currentSyncPromise;
  } finally {
    currentSyncPromise = null;
  }
}
