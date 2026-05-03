import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'soto_bahtiar.db';
const DATABASE_VERSION = 2;

type TableInfoRow = {
  name: string;
};

let dbInstancePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function ensureTableColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const columns = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
}

async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS employee_cache (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT NULL,
      notes TEXT NULL,
      is_active INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wage_drafts (
      key TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      employee_id INTEGER NOT NULL,
      amount_input TEXT NOT NULL,
      notes_input TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wage_sync_queue (
      local_id TEXT PRIMARY KEY NOT NULL,
      dedupe_key TEXT NULL,
      entity TEXT NOT NULL,
      action TEXT NOT NULL,
      client_uuid TEXT NOT NULL,
      server_id INTEGER NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT NULL,
      employee_id INTEGER NULL,
      related_date TEXT NULL,
      week_period_id INTEGER NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS week_period_cache (
      id INTEGER PRIMARY KEY NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL,
      is_locked INTEGER NOT NULL,
      locked_at TEXT NULL,
      employee_count INTEGER NOT NULL,
      filled_wage_count INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_employee_count INTEGER NOT NULL,
      unpaid_employee_count INTEGER NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS current_week_cache (
      id INTEGER PRIMARY KEY NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL,
      is_locked INTEGER NOT NULL,
      locked_at TEXT NULL,
      employee_count INTEGER NOT NULL,
      filled_wage_count INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_employee_count INTEGER NOT NULL,
      unpaid_employee_count INTEGER NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS week_employee_cache (
      week_period_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      employee_name TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL,
      unpaid_amount INTEGER NOT NULL,
      filled_days INTEGER NOT NULL,
      unpaid_days INTEGER NOT NULL,
      can_pay_now INTEGER NOT NULL,
      payment_status TEXT NOT NULL,
      paid_at TEXT NULL,
      is_locked INTEGER NOT NULL,
      cached_at TEXT NOT NULL,
      PRIMARY KEY (week_period_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS daily_wage_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      week_period_id INTEGER NOT NULL,
      wage_date TEXT NOT NULL,
      employee_id INTEGER NOT NULL,
      employee_name TEXT NOT NULL,
      server_id INTEGER NULL,
      client_uuid TEXT NULL,
      amount INTEGER NOT NULL,
      notes TEXT NULL,
      is_paid INTEGER NOT NULL,
      is_locked INTEGER NOT NULL,
      paid_at TEXT NULL,
      updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_payment_history_card_cache (
      history_item_id TEXT PRIMARY KEY NOT NULL,
      payment_id INTEGER NOT NULL,
      week_period_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      employee_name TEXT NULL,
      payment_scope TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_at TEXT NOT NULL,
      notes TEXT NULL,
      can_undo INTEGER NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dashboard_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      meta_key TEXT PRIMARY KEY NOT NULL,
      meta_value TEXT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await ensureTableColumn(db, 'wage_sync_queue', 'dedupe_key', 'dedupe_key TEXT NULL');
  await ensureTableColumn(db, 'wage_sync_queue', 'related_date', 'related_date TEXT NULL');
  await ensureTableColumn(db, 'wage_sync_queue', 'week_period_id', 'week_period_id INTEGER NULL');
  await ensureTableColumn(db, 'daily_wage_cache', 'sync_state', "sync_state TEXT NOT NULL DEFAULT 'synced'");
  await ensureTableColumn(db, 'daily_wage_cache', 'client_uuid', 'client_uuid TEXT NULL');

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_employee_cache_is_active ON employee_cache (is_active);
    CREATE INDEX IF NOT EXISTS idx_employee_cache_name ON employee_cache (name);
    CREATE INDEX IF NOT EXISTS idx_employee_cache_updated_at ON employee_cache (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_wage_drafts_date ON wage_drafts (date);
    CREATE INDEX IF NOT EXISTS idx_wage_drafts_employee_date ON wage_drafts (employee_id, date);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wage_sync_queue_dedupe_key
    ON wage_sync_queue (dedupe_key)
    WHERE dedupe_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_wage_sync_queue_status_created_at ON wage_sync_queue (status, created_at);
    CREATE INDEX IF NOT EXISTS idx_wage_sync_queue_related_date ON wage_sync_queue (related_date, employee_id);
    CREATE INDEX IF NOT EXISTS idx_wage_sync_queue_week_period_id ON wage_sync_queue (week_period_id, employee_id);

    CREATE INDEX IF NOT EXISTS idx_week_period_cache_start_date ON week_period_cache (start_date DESC);
    CREATE INDEX IF NOT EXISTS idx_week_employee_cache_week_period_id ON week_employee_cache (week_period_id, employee_name ASC);
    CREATE INDEX IF NOT EXISTS idx_daily_wage_cache_date ON daily_wage_cache (wage_date, employee_name ASC);
    CREATE INDEX IF NOT EXISTS idx_daily_wage_cache_week_employee ON daily_wage_cache (week_period_id, employee_id, wage_date);
    CREATE INDEX IF NOT EXISTS idx_history_card_cache_week_paid_at
    ON weekly_payment_history_card_cache (week_period_id, paid_at DESC, employee_name ASC);
  `);

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}

export async function getMobileDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstancePromise) {
    dbInstancePromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await migrateDatabase(db);
        return db;
      } catch (error) {
        dbInstancePromise = null;
        throw error;
      }
    })();
  }

  return dbInstancePromise;
}
