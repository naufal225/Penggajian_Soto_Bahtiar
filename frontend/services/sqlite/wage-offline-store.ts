import type { EmployeeItem } from '@/types/employee';
import type { CachedWageSnapshot, SyncOverview } from '@/types/offline';
import type {
  DailyWageByDateEmployee,
  DailyWageByDateResponse,
  DailyWageHistoryItem,
  DailyWageItem,
  SyncPushChange,
  SyncPushResultItem,
  WageSyncState,
  WeekDetailEmployeeStatus,
  WeekPeriodDetailResponse,
  WeekPeriodListItem,
  WeeklyPaymentHistoryCard,
} from '@/types/wage';

import { getMobileDatabase } from '@/services/sqlite/mobile-db';

export interface WageDraftRecord {
  employeeId: number;
  amountInput: string;
  notesInput: string;
}

export interface PendingSyncRecord {
  localId: string;
  dedupeKey: string | null;
  entity: 'daily_wage' | 'weekly_payment';
  action: 'create' | 'update' | 'pay_employee' | 'pay_all' | 'undo';
  clientUuid: string;
  serverId: number | null;
  payload: Record<string, unknown>;
  status: WageSyncState;
  errorMessage: string | null;
  employeeId: number | null;
  relatedDate: string | null;
  weekPeriodId: number | null;
  createdAt: Date;
}

type DraftRow = {
  date: string;
  employee_id: number;
  amount_input: string;
  notes_input: string;
};

type QueueRow = {
  local_id: string;
  dedupe_key: string | null;
  entity: 'daily_wage' | 'weekly_payment';
  action: 'create' | 'update' | 'pay_employee' | 'pay_all' | 'undo';
  client_uuid: string;
  server_id: number | null;
  payload_json: string;
  status: WageSyncState;
  error_message: string | null;
  employee_id: number | null;
  related_date: string | null;
  week_period_id: number | null;
  created_at: string;
};

type WeekPeriodCacheRow = {
  id: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'partial_paid' | 'fully_paid';
  is_locked: number;
  locked_at: string | null;
  employee_count: number;
  filled_wage_count: number;
  total_amount: number;
  paid_employee_count: number;
  unpaid_employee_count: number;
  cached_at: string;
};

type WeekEmployeeCacheRow = {
  week_period_id: number;
  employee_id: number;
  employee_name: string;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  filled_days: number;
  unpaid_days: number;
  can_pay_now: number;
  payment_status: 'paid' | 'unpaid';
  paid_at: string | null;
  is_locked: number;
  cached_at: string;
};

type DailyWageCacheRow = {
  cache_key: string;
  week_period_id: number;
  wage_date: string;
  employee_id: number;
  employee_name: string;
  server_id: number | null;
  client_uuid: string | null;
  amount: number;
  notes: string | null;
  is_paid: number;
  is_locked: number;
  paid_at: string | null;
  updated_at: string;
  sync_state: WageSyncState;
  cached_at: string;
};

type HistoryCardCacheRow = {
  history_item_id: string;
  payment_id: number;
  week_period_id: number;
  employee_id: number;
  employee_name: string | null;
  payment_scope: 'employee' | 'all';
  total_amount: number;
  paid_at: string;
  notes: string | null;
  can_undo: number;
  cached_at: string;
};

type MetaRow = {
  meta_value: string | null;
};

type EmployeeCacheRow = {
  id: number;
  name: string;
  is_active: number;
};

const DRAFT_TABLE = 'wage_drafts';
const QUEUE_TABLE = 'wage_sync_queue';
const WEEK_PERIOD_CACHE_TABLE = 'week_period_cache';
const CURRENT_WEEK_CACHE_TABLE = 'current_week_cache';
const WEEK_EMPLOYEE_CACHE_TABLE = 'week_employee_cache';
const DAILY_WAGE_CACHE_TABLE = 'daily_wage_cache';
const HISTORY_CARD_CACHE_TABLE = 'weekly_payment_history_card_cache';
const META_TABLE = 'sync_meta';

const LAST_SERVER_SYNC_AT_KEY = 'last_server_sync_at';
const LAST_WAGE_DATE_KEY = 'last_wage_date';

function isValidUuid(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const next = char === 'x' ? random : (random & 0x3) | 0x8;
    return next.toString(16);
  });
}

function buildDraftKey(date: string, employeeId: number): string {
  return `${date}:${employeeId}`;
}

function buildDailyWageCacheKey(date: string, employeeId: number): string {
  return `${date}:${employeeId}`;
}

function buildLocalId(): string {
  return buildUuid();
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fallback below
  }

  return {};
}

function isDateInsideWeek(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapWeekPeriodRow(row: WeekPeriodCacheRow): WeekPeriodListItem {
  return {
    id: row.id,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    is_locked: row.is_locked === 1,
    locked_at: row.locked_at,
    summary: {
      employee_count: row.employee_count,
      filled_wage_count: row.filled_wage_count,
      total_amount: row.total_amount,
      paid_employee_count: row.paid_employee_count,
      unpaid_employee_count: row.unpaid_employee_count,
    },
  };
}

function mapHistoryCardRow(row: HistoryCardCacheRow): WeeklyPaymentHistoryCard {
  return {
    history_item_id: row.history_item_id,
    payment_id: row.payment_id,
    week_period_id: row.week_period_id,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    payment_scope: row.payment_scope,
    total_amount: row.total_amount,
    paid_at: row.paid_at,
    notes: row.notes,
    can_undo: row.can_undo === 1,
  };
}

function mapDailyWageRow(row: DailyWageCacheRow): DailyWageItem {
  return {
    id: row.server_id ?? 0,
    amount: row.amount,
    notes: row.notes,
    is_paid: row.is_paid === 1,
    is_locked: row.is_locked === 1,
    wage_date: row.wage_date,
    updated_at: row.updated_at,
  };
}

function mapWeekEmployeeRow(row: WeekEmployeeCacheRow): WeekDetailEmployeeStatus {
  return {
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    total_amount: row.total_amount,
    paid_amount: row.paid_amount,
    unpaid_amount: row.unpaid_amount,
    filled_days: row.filled_days,
    unpaid_days: row.unpaid_days,
    can_pay_now: row.can_pay_now === 1,
    payment_status: row.payment_status,
    paid_at: row.paid_at,
    is_locked: row.is_locked === 1,
  };
}

async function getMetaValue(metaKey: string): Promise<string | null> {
  const db = await getMobileDatabase();
  const row = await db.getFirstAsync<MetaRow>(`SELECT meta_value FROM ${META_TABLE} WHERE meta_key = ?`, [metaKey]);
  return row?.meta_value ?? null;
}

async function setMetaValue(metaKey: string, metaValue: string | null): Promise<void> {
  const db = await getMobileDatabase();
  await db.runAsync(
    `
      INSERT INTO ${META_TABLE} (meta_key, meta_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(meta_key) DO UPDATE SET
        meta_value = excluded.meta_value,
        updated_at = excluded.updated_at
    `,
    [metaKey, metaValue, new Date().toISOString()]
  );
}

async function getCurrentWeekRow(): Promise<WeekPeriodCacheRow | null> {
  const db = await getMobileDatabase();
  return (
    (await db.getFirstAsync<WeekPeriodCacheRow>(
      `
        SELECT
          id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
          total_amount, paid_employee_count, unpaid_employee_count, cached_at
        FROM ${CURRENT_WEEK_CACHE_TABLE}
        ORDER BY cached_at DESC
        LIMIT 1
      `
    )) ?? null
  );
}

async function getWeekEmployeeRows(weekPeriodId: number): Promise<WeekEmployeeCacheRow[]> {
  const db = await getMobileDatabase();
  return db.getAllAsync<WeekEmployeeCacheRow>(
    `
      SELECT
        week_period_id, employee_id, employee_name, total_amount, paid_amount, unpaid_amount, filled_days, unpaid_days,
        can_pay_now, payment_status, paid_at, is_locked, cached_at
      FROM ${WEEK_EMPLOYEE_CACHE_TABLE}
      WHERE week_period_id = ?
      ORDER BY employee_name ASC
    `,
    [weekPeriodId]
  );
}

async function recalculateWeekEmployeeCache(
  weekPeriodId: number,
  employeeId: number,
  overrides?: Partial<{
    paymentStatus: 'paid' | 'unpaid';
    paidAmount: number;
    isLocked: boolean;
    canPayNow: boolean;
    paidAt: string | null;
  }>
): Promise<void> {
  const db = await getMobileDatabase();
  const currentRow = await db.getFirstAsync<WeekEmployeeCacheRow>(
    `
      SELECT
        week_period_id, employee_id, employee_name, total_amount, paid_amount, unpaid_amount, filled_days, unpaid_days,
        can_pay_now, payment_status, paid_at, is_locked, cached_at
      FROM ${WEEK_EMPLOYEE_CACHE_TABLE}
      WHERE week_period_id = ? AND employee_id = ?
    `,
    [weekPeriodId, employeeId]
  );

  if (!currentRow) {
    return;
  }

  const wageRows = await db.getAllAsync<DailyWageCacheRow>(
    `
      SELECT
        cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid, amount, notes,
        is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
      FROM ${DAILY_WAGE_CACHE_TABLE}
      WHERE week_period_id = ? AND employee_id = ?
    `,
    [weekPeriodId, employeeId]
  );

  const totalAmount = wageRows.reduce((sum, row) => sum + row.amount, 0);
  const filledDays = wageRows.length;
  const nextPaymentStatus = overrides?.paymentStatus ?? currentRow.payment_status;
  const nextPaidAmount = overrides?.paidAmount ?? (nextPaymentStatus === 'paid' ? totalAmount : currentRow.paid_amount);
  const unpaidAmount = Math.max(totalAmount - nextPaidAmount, 0);
  const isLocked = overrides?.isLocked ?? currentRow.is_locked === 1;
  const canPayNow = overrides?.canPayNow ?? (!isLocked && unpaidAmount > 0 && filledDays > 0);
  const paidAt = overrides?.paidAt === undefined ? currentRow.paid_at : overrides.paidAt;
  const unpaidDays = nextPaymentStatus === 'paid' ? 0 : filledDays;

  await db.runAsync(
    `
      UPDATE ${WEEK_EMPLOYEE_CACHE_TABLE}
      SET total_amount = ?, paid_amount = ?, unpaid_amount = ?, filled_days = ?, unpaid_days = ?,
          can_pay_now = ?, payment_status = ?, paid_at = ?, is_locked = ?, cached_at = ?
      WHERE week_period_id = ? AND employee_id = ?
    `,
    [
      totalAmount,
      nextPaidAmount,
      unpaidAmount,
      filledDays,
      unpaidDays,
      canPayNow ? 1 : 0,
      nextPaymentStatus,
      paidAt,
      isLocked ? 1 : 0,
      new Date().toISOString(),
      weekPeriodId,
      employeeId,
    ]
  );
}

async function recalculateCurrentWeekSummary(weekPeriodId: number): Promise<void> {
  const db = await getMobileDatabase();
  const employeeRows = await db.getAllAsync<WeekEmployeeCacheRow>(
    `
      SELECT
        week_period_id, employee_id, employee_name, total_amount, paid_amount, unpaid_amount, filled_days, unpaid_days,
        can_pay_now, payment_status, paid_at, is_locked, cached_at
      FROM ${WEEK_EMPLOYEE_CACHE_TABLE}
      WHERE week_period_id = ?
    `,
    [weekPeriodId]
  );

  if (employeeRows.length === 0) {
    return;
  }

  const totalAmount = employeeRows.reduce((sum, row) => sum + row.total_amount, 0);
  const filledWageCount = employeeRows.reduce((sum, row) => sum + row.filled_days, 0);
  const paidEmployeeCount = employeeRows.filter((row) => row.payment_status === 'paid').length;
  const unpaidEmployeeCount = employeeRows.length - paidEmployeeCount;
  const status: 'open' | 'partial_paid' | 'fully_paid' =
    paidEmployeeCount === 0 ? 'open' : unpaidEmployeeCount === 0 ? 'fully_paid' : 'partial_paid';
  const isLocked = status === 'fully_paid';
  const lockedAt = isLocked ? new Date().toISOString() : null;
  const cachedAt = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE ${CURRENT_WEEK_CACHE_TABLE}
      SET status = ?, is_locked = ?, locked_at = ?, employee_count = ?, filled_wage_count = ?, total_amount = ?,
          paid_employee_count = ?, unpaid_employee_count = ?, cached_at = ?
      WHERE id = ?
    `,
    [
      status,
      isLocked ? 1 : 0,
      lockedAt,
      employeeRows.length,
      filledWageCount,
      totalAmount,
      paidEmployeeCount,
      unpaidEmployeeCount,
      cachedAt,
      weekPeriodId,
    ]
  );

  await db.runAsync(
    `
      INSERT INTO ${WEEK_PERIOD_CACHE_TABLE} (
        id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
        total_amount, paid_employee_count, unpaid_employee_count, cached_at
      )
      SELECT
        id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
        total_amount, paid_employee_count, unpaid_employee_count, cached_at
      FROM ${CURRENT_WEEK_CACHE_TABLE}
      WHERE id = ?
      ON CONFLICT(id) DO UPDATE SET
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        status = excluded.status,
        is_locked = excluded.is_locked,
        locked_at = excluded.locked_at,
        employee_count = excluded.employee_count,
        filled_wage_count = excluded.filled_wage_count,
        total_amount = excluded.total_amount,
        paid_employee_count = excluded.paid_employee_count,
        unpaid_employee_count = excluded.unpaid_employee_count,
        cached_at = excluded.cached_at
    `,
    [weekPeriodId]
  );
}

function buildWeekDetail(
  weekRow: WeekPeriodCacheRow,
  employeeRows: WeekEmployeeCacheRow[]
): WeekPeriodDetailResponse {
  return {
    id: weekRow.id,
    start_date: weekRow.start_date,
    end_date: weekRow.end_date,
    status: weekRow.status,
    is_locked: weekRow.is_locked === 1,
    locked_at: weekRow.locked_at,
    summary: {
      employee_count: weekRow.employee_count,
      filled_wage_count: weekRow.filled_wage_count,
      total_amount: weekRow.total_amount,
      paid_employee_count: weekRow.paid_employee_count,
      unpaid_employee_count: weekRow.unpaid_employee_count,
    },
    employees: employeeRows.map(mapWeekEmployeeRow),
  };
}

function buildQueueDedupeKey(input: {
  entity: 'daily_wage' | 'weekly_payment';
  action: 'create' | 'update' | 'pay_employee' | 'pay_all' | 'undo';
  serverId?: number | null;
  payload: Record<string, unknown>;
  employeeId?: number | null;
  relatedDate?: string | null;
  weekPeriodId?: number | null;
}): string | null {
  if (input.entity === 'daily_wage') {
    const employeeId = input.employeeId ?? toInteger(input.payload.employee_id);
    const wageDate = input.relatedDate ?? toNullableString(input.payload.wage_date);
    if (employeeId && wageDate) {
      return `daily_wage:${wageDate}:${employeeId}`;
    }
    return null;
  }

  if (input.action === 'pay_employee') {
    const employeeId = input.employeeId ?? toInteger(input.payload.employee_id);
    const weekPeriodId = input.weekPeriodId ?? toInteger(input.payload.week_period_id);
    if (employeeId && weekPeriodId) {
      return `weekly_payment:pay_employee:${weekPeriodId}:${employeeId}`;
    }
  }

  if (input.action === 'pay_all') {
    const weekPeriodId = input.weekPeriodId ?? toInteger(input.payload.week_period_id);
    if (weekPeriodId) {
      return `weekly_payment:pay_all:${weekPeriodId}`;
    }
  }

  if (input.action === 'undo') {
    const paymentId = input.serverId ?? toInteger(input.payload.payment_id);
    if (paymentId) {
      return `weekly_payment:undo:${paymentId}`;
    }
  }

  return null;
}

export async function getDraftsByDate(date: string): Promise<Record<number, WageDraftRecord>> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<DraftRow>(
    `SELECT date, employee_id, amount_input, notes_input FROM ${DRAFT_TABLE} WHERE date = ?`,
    [date]
  );

  const map: Record<number, WageDraftRecord> = {};
  for (const row of rows) {
    map[row.employee_id] = {
      employeeId: row.employee_id,
      amountInput: row.amount_input,
      notesInput: row.notes_input,
    };
  }

  return map;
}

export async function upsertDraft(date: string, employeeId: number, amountInput: string, notesInput: string): Promise<void> {
  const db = await getMobileDatabase();
  const key = buildDraftKey(date, employeeId);
  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT INTO ${DRAFT_TABLE} (key, date, employee_id, amount_input, notes_input, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        amount_input = excluded.amount_input,
        notes_input = excluded.notes_input,
        updated_at = excluded.updated_at
    `,
    [key, date, employeeId, amountInput, notesInput, now]
  );
}

export async function deleteDraft(date: string, employeeId: number): Promise<void> {
  const db = await getMobileDatabase();
  const key = buildDraftKey(date, employeeId);
  await db.runAsync(`DELETE FROM ${DRAFT_TABLE} WHERE key = ?`, [key]);
}

export async function clearDraftsByDate(date: string): Promise<void> {
  const db = await getMobileDatabase();
  await db.runAsync(`DELETE FROM ${DRAFT_TABLE} WHERE date = ?`, [date]);
}

export async function enqueueSyncChange(input: {
  entity: 'daily_wage' | 'weekly_payment';
  action: 'create' | 'update' | 'pay_employee' | 'pay_all' | 'undo';
  serverId?: number | null;
  payload: Record<string, unknown>;
  employeeId?: number | null;
  relatedDate?: string | null;
  weekPeriodId?: number | null;
}): Promise<string> {
  const db = await getMobileDatabase();
  const dedupeKey = buildQueueDedupeKey(input);
  const now = new Date().toISOString();

  if (dedupeKey) {
    const existing = await db.getFirstAsync<{ local_id: string; client_uuid: string }>(
      `SELECT local_id, client_uuid FROM ${QUEUE_TABLE} WHERE dedupe_key = ?`,
      [dedupeKey]
    );

    if (existing?.local_id) {
      await db.runAsync(
        `
          UPDATE ${QUEUE_TABLE}
          SET entity = ?, action = ?, server_id = ?, payload_json = ?, status = ?, error_message = ?,
              employee_id = ?, related_date = ?, week_period_id = ?, updated_at = ?
          WHERE local_id = ?
        `,
        [
          input.entity,
          input.action,
          input.serverId ?? null,
          JSON.stringify(input.payload ?? {}),
          'pending',
          null,
          input.employeeId ?? null,
          input.relatedDate ?? null,
          input.weekPeriodId ?? null,
          now,
          existing.local_id,
        ]
      );

      return existing.client_uuid;
    }
  }

  const localId = buildLocalId();
  const clientUuid = buildUuid();

  await db.runAsync(
    `
      INSERT INTO ${QUEUE_TABLE} (
        local_id, dedupe_key, entity, action, client_uuid, server_id, payload_json, status, error_message,
        employee_id, related_date, week_period_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      localId,
      dedupeKey,
      input.entity,
      input.action,
      clientUuid,
      input.serverId ?? null,
      JSON.stringify(input.payload ?? {}),
      'pending',
      null,
      input.employeeId ?? null,
      input.relatedDate ?? null,
      input.weekPeriodId ?? null,
      now,
      now,
    ]
  );

  return clientUuid;
}

async function ensureValidQueueClientUuids(): Promise<void> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<{ local_id: string; client_uuid: string }>(
    `SELECT local_id, client_uuid FROM ${QUEUE_TABLE}`
  );

  for (const row of rows) {
    if (isValidUuid(row.client_uuid)) {
      continue;
    }

    await db.runAsync(
      `
        UPDATE ${QUEUE_TABLE}
        SET client_uuid = ?, updated_at = ?
        WHERE local_id = ?
      `,
      [buildUuid(), new Date().toISOString(), row.local_id]
    );
  }
}

export async function getPendingSyncChanges(limit = 50): Promise<PendingSyncRecord[]> {
  await ensureValidQueueClientUuids();
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<QueueRow>(
    `
      SELECT
        local_id, dedupe_key, entity, action, client_uuid, server_id, payload_json, status, error_message,
        employee_id, related_date, week_period_id, created_at
      FROM ${QUEUE_TABLE}
      WHERE status IN ('pending', 'failed')
      ORDER BY created_at ASC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    localId: row.local_id,
    dedupeKey: row.dedupe_key,
    entity: row.entity,
    action: row.action,
    clientUuid: row.client_uuid,
    serverId: row.server_id,
    payload: parsePayload(row.payload_json),
    status: row.status,
    errorMessage: row.error_message,
    employeeId: row.employee_id,
    relatedDate: row.related_date,
    weekPeriodId: row.week_period_id,
    createdAt: new Date(row.created_at),
  }));
}

export async function getSyncQueueStateByEmployee(date: string, weekPeriodId: number | null): Promise<Record<number, WageSyncState>> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<QueueRow>(
    `
      SELECT
        local_id, dedupe_key, entity, action, client_uuid, server_id, payload_json, status, error_message,
        employee_id, related_date, week_period_id, created_at
      FROM ${QUEUE_TABLE}
      WHERE employee_id IS NOT NULL
        AND status IN ('pending', 'failed', 'conflict')
        AND (related_date = ? OR week_period_id = ?)
      ORDER BY created_at DESC
    `,
    [date, weekPeriodId]
  );

  const map: Record<number, WageSyncState> = {};
  for (const row of rows) {
    if (row.employee_id === null || map[row.employee_id]) {
      continue;
    }

    map[row.employee_id] = row.status;
  }

  return map;
}

export async function markSyncResult(result: SyncPushResultItem): Promise<void> {
  if (!result.client_uuid) {
    return;
  }

  const db = await getMobileDatabase();
  if (result.status === 'success') {
    await db.runAsync(`DELETE FROM ${QUEUE_TABLE} WHERE client_uuid = ?`, [result.client_uuid]);
    return;
  }

  await db.runAsync(
    `
      UPDATE ${QUEUE_TABLE}
      SET status = ?, error_message = ?, updated_at = ?
      WHERE client_uuid = ?
    `,
    [result.status, result.error?.message ?? 'Terjadi masalah', new Date().toISOString(), result.client_uuid]
  );
}

export function toSyncPushChange(row: PendingSyncRecord): SyncPushChange {
  return {
    entity: row.entity,
    action: row.action,
    client_uuid: row.clientUuid,
    server_id: row.serverId,
    payload: row.payload,
  };
}

export async function cacheCurrentWeekDetail(detail: WeekPeriodDetailResponse): Promise<void> {
  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${CURRENT_WEEK_CACHE_TABLE}`);

    await db.runAsync(
      `
        INSERT INTO ${CURRENT_WEEK_CACHE_TABLE} (
          id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
          total_amount, paid_employee_count, unpaid_employee_count, cached_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        detail.id,
        detail.start_date,
        detail.end_date,
        detail.status,
        detail.is_locked ? 1 : 0,
        detail.locked_at,
        detail.summary.employee_count,
        detail.summary.filled_wage_count,
        detail.summary.total_amount,
        detail.summary.paid_employee_count,
        detail.summary.unpaid_employee_count,
        now,
      ]
    );

    await db.runAsync(
      `
        INSERT INTO ${WEEK_PERIOD_CACHE_TABLE} (
          id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
          total_amount, paid_employee_count, unpaid_employee_count, cached_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          status = excluded.status,
          is_locked = excluded.is_locked,
          locked_at = excluded.locked_at,
          employee_count = excluded.employee_count,
          filled_wage_count = excluded.filled_wage_count,
          total_amount = excluded.total_amount,
          paid_employee_count = excluded.paid_employee_count,
          unpaid_employee_count = excluded.unpaid_employee_count,
          cached_at = excluded.cached_at
      `,
      [
        detail.id,
        detail.start_date,
        detail.end_date,
        detail.status,
        detail.is_locked ? 1 : 0,
        detail.locked_at,
        detail.summary.employee_count,
        detail.summary.filled_wage_count,
        detail.summary.total_amount,
        detail.summary.paid_employee_count,
        detail.summary.unpaid_employee_count,
        now,
      ]
    );

    await db.runAsync(`DELETE FROM ${WEEK_EMPLOYEE_CACHE_TABLE} WHERE week_period_id = ?`, [detail.id]);

    for (const employee of detail.employees) {
      await db.runAsync(
        `
          INSERT INTO ${WEEK_EMPLOYEE_CACHE_TABLE} (
            week_period_id, employee_id, employee_name, total_amount, paid_amount, unpaid_amount,
            filled_days, unpaid_days, can_pay_now, payment_status, paid_at, is_locked, cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          detail.id,
          employee.employee_id,
          employee.employee_name,
          employee.total_amount,
          employee.paid_amount,
          employee.unpaid_amount,
          employee.filled_days,
          employee.unpaid_days,
          employee.can_pay_now ? 1 : 0,
          employee.payment_status,
          employee.paid_at,
          employee.is_locked ? 1 : 0,
          now,
        ]
      );
    }
  });
}

export async function cacheDailyWagesByDate(response: DailyWageByDateResponse): Promise<void> {
  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const employee of response.employees) {
      const cacheKey = buildDailyWageCacheKey(response.date, employee.employee_id);

      if (!employee.daily_wage) {
        const existing = await db.getFirstAsync<Pick<DailyWageCacheRow, 'sync_state'>>(
          `SELECT sync_state FROM ${DAILY_WAGE_CACHE_TABLE} WHERE cache_key = ?`,
          [cacheKey]
        );

        if (!existing || existing.sync_state === 'synced') {
          await db.runAsync(`DELETE FROM ${DAILY_WAGE_CACHE_TABLE} WHERE cache_key = ?`, [cacheKey]);
        }

        continue;
      }

      await db.runAsync(
        `
          INSERT INTO ${DAILY_WAGE_CACHE_TABLE} (
            cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid,
            amount, notes, is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET
            week_period_id = excluded.week_period_id,
            wage_date = excluded.wage_date,
            employee_name = excluded.employee_name,
            server_id = excluded.server_id,
            client_uuid = excluded.client_uuid,
            amount = excluded.amount,
            notes = excluded.notes,
            is_paid = excluded.is_paid,
            is_locked = excluded.is_locked,
            paid_at = excluded.paid_at,
            updated_at = excluded.updated_at,
            sync_state = excluded.sync_state,
            cached_at = excluded.cached_at
        `,
        [
          cacheKey,
          response.week_period.id,
          response.date,
          employee.employee_id,
          employee.employee_name,
          employee.daily_wage.id,
          null,
          employee.daily_wage.amount,
          employee.daily_wage.notes,
          employee.daily_wage.is_paid ? 1 : 0,
          employee.daily_wage.is_locked ? 1 : 0,
          (employee.daily_wage as DailyWageItem & { paid_at?: string | null }).paid_at ?? null,
          employee.daily_wage.updated_at,
          'synced',
          now,
        ]
      );
    }
  });
}

export async function getCachedCurrentWeekDetail(): Promise<WeekPeriodDetailResponse | null> {
  const weekRow = await getCurrentWeekRow();
  if (!weekRow) {
    return null;
  }

  const employeeRows = await getWeekEmployeeRows(weekRow.id);
  if (employeeRows.length === 0) {
    return null;
  }

  return buildWeekDetail(weekRow, employeeRows);
}

export async function getCachedWageSnapshot(date: string): Promise<CachedWageSnapshot | null> {
  const weekRow = await getCurrentWeekRow();
  if (!weekRow || !isDateInsideWeek(date, weekRow.start_date, weekRow.end_date)) {
    return null;
  }

  const employeeRows = await getWeekEmployeeRows(weekRow.id);
  if (employeeRows.length === 0) {
    return null;
  }

  const db = await getMobileDatabase();
  const dailyRows = await db.getAllAsync<DailyWageCacheRow>(
    `
      SELECT
        cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid, amount, notes,
        is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
      FROM ${DAILY_WAGE_CACHE_TABLE}
      WHERE week_period_id = ? AND wage_date = ?
    `,
    [weekRow.id, date]
  );

  const dailyMap = new Map(dailyRows.map((row) => [row.employee_id, row]));
  const employees: DailyWageByDateEmployee[] = employeeRows.map((row) => {
    const dailyRow = dailyMap.get(row.employee_id);
    return {
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      daily_wage: dailyRow ? mapDailyWageRow(dailyRow) : null,
    };
  });

  return {
    data: {
      date,
      week_period: {
        id: weekRow.id,
        start_date: weekRow.start_date,
        end_date: weekRow.end_date,
        status: weekRow.status,
        is_locked: weekRow.is_locked === 1,
      },
      employees,
    },
    weekDetail: buildWeekDetail(weekRow, employeeRows),
    cachedAt: weekRow.cached_at,
  };
}

export async function getFallbackOfflineWageSnapshot(date: string): Promise<CachedWageSnapshot | null> {
  const db = await getMobileDatabase();
  const employees = await db.getAllAsync<EmployeeCacheRow>(
    `
      SELECT id, name, is_active
      FROM employee_cache
      WHERE is_active = 1
      ORDER BY name ASC
    `
  );

  if (employees.length === 0) {
    return null;
  }

  const dailyRows = await db.getAllAsync<DailyWageCacheRow>(
    `
      SELECT
        cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid, amount, notes,
        is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
      FROM ${DAILY_WAGE_CACHE_TABLE}
      WHERE wage_date = ?
      ORDER BY employee_name ASC
    `,
    [date]
  );

  const dailyMap = new Map(dailyRows.map((row) => [row.employee_id, row]));
  const totalAmount = dailyRows.reduce((sum, row) => sum + row.amount, 0);
  const cachedAt = dailyRows[0]?.cached_at ?? null;

  const pseudoDetail: WeekPeriodDetailResponse = {
    id: 0,
    start_date: date,
    end_date: date,
    status: 'open',
    is_locked: false,
    locked_at: null,
    summary: {
      employee_count: employees.length,
      filled_wage_count: dailyRows.length,
      total_amount: totalAmount,
      paid_employee_count: 0,
      unpaid_employee_count: 0,
    },
    employees: employees.map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.name,
      total_amount: 0,
      paid_amount: 0,
      unpaid_amount: 0,
      filled_days: 0,
      unpaid_days: 0,
      can_pay_now: false,
      payment_status: 'unpaid',
      paid_at: null,
      is_locked: false,
    })),
  };

  return {
    data: {
      date,
      week_period: {
        id: 0,
        start_date: date,
        end_date: date,
        status: 'open',
        is_locked: false,
      },
      employees: employees.map((employee) => ({
        employee_id: employee.id,
        employee_name: employee.name,
        daily_wage: dailyMap.get(employee.id) ? mapDailyWageRow(dailyMap.get(employee.id) as DailyWageCacheRow) : null,
      })),
    },
    weekDetail: pseudoDetail,
    cachedAt,
  };
}

export async function getCachedDailyWageHistoryRange(startDate: string, endDate: string): Promise<DailyWageHistoryItem[]> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<DailyWageCacheRow>(
    `
      SELECT
        cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid, amount, notes,
        is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
      FROM ${DAILY_WAGE_CACHE_TABLE}
      WHERE wage_date >= ? AND wage_date <= ?
      ORDER BY wage_date ASC, employee_name ASC
    `,
    [startDate, endDate]
  );

  return rows.map((row) => ({
    id: row.server_id ?? 0,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    week_period_id: row.week_period_id,
    wage_date: row.wage_date,
    amount: row.amount,
    is_paid: row.is_paid === 1,
    is_locked: row.is_locked === 1,
    updated_at: row.updated_at,
  }));
}

export async function saveOfflineDailyWage(params: {
  weekPeriodId: number;
  date: string;
  employeeId: number;
  employeeName: string;
  dailyWageId: number | null;
  amount: number;
  notes: string | null;
  clientUuid: string;
}): Promise<void> {
  const db = await getMobileDatabase();
  const cacheKey = buildDailyWageCacheKey(params.date, params.employeeId);
  const existing = await db.getFirstAsync<DailyWageCacheRow>(
    `
      SELECT
        cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid, amount, notes,
        is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
      FROM ${DAILY_WAGE_CACHE_TABLE}
      WHERE cache_key = ?
    `,
    [cacheKey]
  );

  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT INTO ${DAILY_WAGE_CACHE_TABLE} (
        cache_key, week_period_id, wage_date, employee_id, employee_name, server_id, client_uuid, amount, notes,
        is_paid, is_locked, paid_at, updated_at, sync_state, cached_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        week_period_id = excluded.week_period_id,
        employee_name = excluded.employee_name,
        server_id = excluded.server_id,
        client_uuid = excluded.client_uuid,
        amount = excluded.amount,
        notes = excluded.notes,
        is_paid = excluded.is_paid,
        is_locked = excluded.is_locked,
        paid_at = excluded.paid_at,
        updated_at = excluded.updated_at,
        sync_state = excluded.sync_state,
        cached_at = excluded.cached_at
    `,
    [
      cacheKey,
      params.weekPeriodId,
      params.date,
      params.employeeId,
      params.employeeName,
      params.dailyWageId ?? existing?.server_id ?? null,
      params.clientUuid,
      params.amount,
      params.notes,
      existing?.is_paid ?? 0,
      existing?.is_locked ?? 0,
      existing?.paid_at ?? null,
      now,
      'pending',
      now,
    ]
  );

  await recalculateWeekEmployeeCache(params.weekPeriodId, params.employeeId);
  await recalculateCurrentWeekSummary(params.weekPeriodId);
}

async function addOfflineHistoryCards(
  weekPeriodId: number,
  paymentId: number,
  paymentScope: 'employee' | 'all',
  employeeRows: WeekEmployeeCacheRow[]
): Promise<void> {
  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const row of employeeRows) {
      await db.runAsync(
        `
          INSERT INTO ${HISTORY_CARD_CACHE_TABLE} (
            history_item_id, payment_id, week_period_id, employee_id, employee_name, payment_scope,
            total_amount, paid_at, notes, can_undo, cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(history_item_id) DO UPDATE SET
            payment_id = excluded.payment_id,
            week_period_id = excluded.week_period_id,
            employee_name = excluded.employee_name,
            payment_scope = excluded.payment_scope,
            total_amount = excluded.total_amount,
            paid_at = excluded.paid_at,
            notes = excluded.notes,
            can_undo = excluded.can_undo,
            cached_at = excluded.cached_at
        `,
        [
          `offline:${paymentId}:${row.employee_id}`,
          paymentId,
          weekPeriodId,
          row.employee_id,
          row.employee_name,
          paymentScope,
          row.unpaid_amount,
          now,
          null,
          1,
          now,
        ]
      );
    }
  });
}

export async function saveOfflineWeeklyPayment(params: {
  weekPeriodId: number;
  employeeId?: number | null;
  paymentScope: 'employee' | 'all';
}): Promise<void> {
  const db = await getMobileDatabase();
  const paymentId = -Date.now();
  const employeeRows = params.employeeId
    ? await db.getAllAsync<WeekEmployeeCacheRow>(
        `
          SELECT
            week_period_id, employee_id, employee_name, total_amount, paid_amount, unpaid_amount, filled_days, unpaid_days,
            can_pay_now, payment_status, paid_at, is_locked, cached_at
          FROM ${WEEK_EMPLOYEE_CACHE_TABLE}
          WHERE week_period_id = ? AND employee_id = ?
        `,
        [params.weekPeriodId, params.employeeId]
      )
    : await db.getAllAsync<WeekEmployeeCacheRow>(
        `
          SELECT
            week_period_id, employee_id, employee_name, total_amount, paid_amount, unpaid_amount, filled_days, unpaid_days,
            can_pay_now, payment_status, paid_at, is_locked, cached_at
          FROM ${WEEK_EMPLOYEE_CACHE_TABLE}
          WHERE week_period_id = ? AND unpaid_amount > 0
        `,
        [params.weekPeriodId]
      );

  const paidAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const row of employeeRows) {
      await db.runAsync(
        `
          UPDATE ${WEEK_EMPLOYEE_CACHE_TABLE}
          SET payment_status = ?, paid_amount = ?, unpaid_amount = ?, can_pay_now = ?, paid_at = ?, is_locked = ?, cached_at = ?
          WHERE week_period_id = ? AND employee_id = ?
        `,
        ['paid', row.total_amount, 0, 0, paidAt, 1, paidAt, params.weekPeriodId, row.employee_id]
      );

      await db.runAsync(
        `
          UPDATE ${DAILY_WAGE_CACHE_TABLE}
          SET is_paid = 1, is_locked = 1, paid_at = ?, cached_at = ?
          WHERE week_period_id = ? AND employee_id = ?
        `,
        [paidAt, paidAt, params.weekPeriodId, row.employee_id]
      );
    }
  });

  await addOfflineHistoryCards(params.weekPeriodId, paymentId, params.paymentScope, employeeRows);

  for (const row of employeeRows) {
    await recalculateWeekEmployeeCache(params.weekPeriodId, row.employee_id, {
      paymentStatus: 'paid',
      paidAmount: row.total_amount,
      isLocked: true,
      canPayNow: false,
      paidAt,
    });
  }

  await recalculateCurrentWeekSummary(params.weekPeriodId);
}

export async function saveOfflineUndoPayment(paymentId: number): Promise<number | null> {
  const db = await getMobileDatabase();
  const historyRows = await db.getAllAsync<HistoryCardCacheRow>(
    `
      SELECT
        history_item_id, payment_id, week_period_id, employee_id, employee_name, payment_scope,
        total_amount, paid_at, notes, can_undo, cached_at
      FROM ${HISTORY_CARD_CACHE_TABLE}
      WHERE payment_id = ?
    `,
    [paymentId]
  );

  if (historyRows.length === 0) {
    return null;
  }

  const weekPeriodId = historyRows[0].week_period_id;
  const employeeIds = [...new Set(historyRows.map((row) => row.employee_id))];

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${HISTORY_CARD_CACHE_TABLE} WHERE payment_id = ?`, [paymentId]);

    for (const employeeId of employeeIds) {
      await db.runAsync(
        `
          UPDATE ${WEEK_EMPLOYEE_CACHE_TABLE}
          SET payment_status = ?, paid_amount = 0, can_pay_now = 1, paid_at = NULL, is_locked = 0, cached_at = ?
          WHERE week_period_id = ? AND employee_id = ?
        `,
        ['unpaid', new Date().toISOString(), weekPeriodId, employeeId]
      );

      await db.runAsync(
        `
          UPDATE ${DAILY_WAGE_CACHE_TABLE}
          SET is_paid = 0, is_locked = 0, paid_at = NULL, cached_at = ?
          WHERE week_period_id = ? AND employee_id = ?
        `,
        [new Date().toISOString(), weekPeriodId, employeeId]
      );
    }
  });

  for (const employeeId of employeeIds) {
    await recalculateWeekEmployeeCache(weekPeriodId, employeeId, {
      paymentStatus: 'unpaid',
      paidAmount: 0,
      isLocked: false,
      paidAt: null,
    });
  }

  await recalculateCurrentWeekSummary(weekPeriodId);

  return weekPeriodId;
}

export async function applySyncResultToCache(
  queueItem: PendingSyncRecord,
  result: SyncPushResultItem
): Promise<void> {
  if (queueItem.entity !== 'daily_wage') {
    return;
  }

  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  if (queueItem.relatedDate && queueItem.employeeId) {
    const cacheKey = buildDailyWageCacheKey(queueItem.relatedDate, queueItem.employeeId);
    await db.runAsync(
      `
        UPDATE ${DAILY_WAGE_CACHE_TABLE}
        SET server_id = COALESCE(?, server_id),
            client_uuid = CASE WHEN ? = 'success' THEN NULL ELSE client_uuid END,
            sync_state = ?,
            cached_at = ?
        WHERE cache_key = ?
      `,
      [result.server_id, result.status, result.status === 'success' ? 'synced' : result.status, now, cacheKey]
    );
  }
}

export async function cacheWeekPeriods(items: WeekPeriodListItem[]): Promise<void> {
  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `
          INSERT INTO ${WEEK_PERIOD_CACHE_TABLE} (
            id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
            total_amount, paid_employee_count, unpaid_employee_count, cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            status = excluded.status,
            is_locked = excluded.is_locked,
            locked_at = excluded.locked_at,
            employee_count = excluded.employee_count,
            filled_wage_count = excluded.filled_wage_count,
            total_amount = excluded.total_amount,
            paid_employee_count = excluded.paid_employee_count,
            unpaid_employee_count = excluded.unpaid_employee_count,
            cached_at = excluded.cached_at
        `,
        [
          item.id,
          item.start_date,
          item.end_date,
          item.status,
          item.is_locked ? 1 : 0,
          item.locked_at,
          item.summary.employee_count,
          item.summary.filled_wage_count,
          item.summary.total_amount,
          item.summary.paid_employee_count,
          item.summary.unpaid_employee_count,
          now,
        ]
      );
    }
  });
}

export async function getCachedWeekPeriods(limit = 12): Promise<WeekPeriodListItem[]> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<WeekPeriodCacheRow>(
    `
      SELECT
        id, start_date, end_date, status, is_locked, locked_at, employee_count, filled_wage_count,
        total_amount, paid_employee_count, unpaid_employee_count, cached_at
      FROM ${WEEK_PERIOD_CACHE_TABLE}
      ORDER BY start_date DESC, id DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map(mapWeekPeriodRow);
}

export async function cacheWeeklyPaymentHistoryCards(
  weekPeriodId: number,
  items: WeeklyPaymentHistoryCard[]
): Promise<void> {
  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${HISTORY_CARD_CACHE_TABLE} WHERE week_period_id = ?`, [weekPeriodId]);

    for (const item of items) {
      await db.runAsync(
        `
          INSERT INTO ${HISTORY_CARD_CACHE_TABLE} (
            history_item_id, payment_id, week_period_id, employee_id, employee_name, payment_scope,
            total_amount, paid_at, notes, can_undo, cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.history_item_id,
          item.payment_id,
          item.week_period_id,
          item.employee_id,
          item.employee_name,
          item.payment_scope,
          item.total_amount,
          item.paid_at,
          item.notes,
          item.can_undo ? 1 : 0,
          now,
        ]
      );
    }
  });
}

export async function getCachedWeeklyPaymentHistoryCards(weekPeriodId: number): Promise<WeeklyPaymentHistoryCard[]> {
  const db = await getMobileDatabase();
  const rows = await db.getAllAsync<HistoryCardCacheRow>(
    `
      SELECT
        history_item_id, payment_id, week_period_id, employee_id, employee_name, payment_scope,
        total_amount, paid_at, notes, can_undo, cached_at
      FROM ${HISTORY_CARD_CACHE_TABLE}
      WHERE week_period_id = ?
      ORDER BY paid_at DESC, employee_name ASC
    `,
    [weekPeriodId]
  );

  return rows.map(mapHistoryCardRow);
}

export async function getSyncOverview(): Promise<SyncOverview> {
  const db = await getMobileDatabase();
  const countRow = await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${QUEUE_TABLE}`);

  return {
    pendingSyncCount: countRow?.total ?? 0,
    lastServerSyncAt: await getMetaValue(LAST_SERVER_SYNC_AT_KEY),
    lastWageDate: await getMetaValue(LAST_WAGE_DATE_KEY),
  };
}

export async function setLastServerSyncAt(value: string | null): Promise<void> {
  await setMetaValue(LAST_SERVER_SYNC_AT_KEY, value);
}

export async function setLastViewedWageDate(date: string): Promise<void> {
  await setMetaValue(LAST_WAGE_DATE_KEY, date);
}
