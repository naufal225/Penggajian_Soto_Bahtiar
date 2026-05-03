import type { DashboardSummary } from '@/types/dashboard';
import type { CachedDashboardSnapshot } from '@/types/offline';

import { getMobileDatabase } from '@/services/sqlite/mobile-db';

const CACHE_KEY = 'dashboard_summary';
const TABLE_NAME = 'dashboard_cache';

type DashboardCacheRow = {
  payload_json: string;
  cached_at: string;
};

function parseSummary(payloadJson: string): DashboardSummary | null {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as DashboardSummary;
    }
  } catch {
    // fallback below
  }

  return null;
}

export async function cacheDashboardSummary(summary: DashboardSummary): Promise<string> {
  const db = await getMobileDatabase();
  const cachedAt = new Date().toISOString();

  await db.runAsync(
    `
      INSERT INTO ${TABLE_NAME} (cache_key, payload_json, cached_at)
      VALUES (?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        payload_json = excluded.payload_json,
        cached_at = excluded.cached_at
    `,
    [CACHE_KEY, JSON.stringify(summary), cachedAt]
  );

  return cachedAt;
}

export async function getCachedDashboardSummary(): Promise<CachedDashboardSnapshot | null> {
  const db = await getMobileDatabase();
  const row = await db.getFirstAsync<DashboardCacheRow>(
    `SELECT payload_json, cached_at FROM ${TABLE_NAME} WHERE cache_key = ?`,
    [CACHE_KEY]
  );

  if (!row) {
    return null;
  }

  const summary = parseSummary(row.payload_json);
  if (!summary) {
    return null;
  }

  return {
    summary,
    cachedAt: row.cached_at,
  };
}
