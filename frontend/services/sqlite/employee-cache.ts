import type { EmployeeItem, EmployeeStatusFilter } from '@/types/employee';

import { getMobileDatabase } from '@/services/sqlite/mobile-db';

type EmployeeCacheRow = {
  id: number;
  name: string;
  phone_number: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const TABLE_NAME = 'employee_cache';

function mapRowToEmployeeItem(row: EmployeeCacheRow): EmployeeItem {
  return {
    id: row.id,
    name: row.name,
    phone_number: row.phone_number,
    notes: row.notes,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function cacheEmployees(items: EmployeeItem[]): Promise<void> {
  if (!items.length) {
    return;
  }

  const db = await getMobileDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `
          INSERT INTO ${TABLE_NAME} (
            id, name, phone_number, notes, is_active, created_at, updated_at, cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            phone_number = excluded.phone_number,
            notes = excluded.notes,
            is_active = excluded.is_active,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            cached_at = excluded.cached_at;
        `,
        item.id,
        item.name,
        item.phone_number,
        item.notes,
        item.is_active ? 1 : 0,
        item.created_at,
        item.updated_at,
        now
      );
    }
  });
}

export async function getCachedEmployees(
  status: EmployeeStatusFilter,
  searchKeyword: string
): Promise<EmployeeItem[]> {
  const db = await getMobileDatabase();
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (status === 'active') {
    conditions.push('is_active = 1');
  } else if (status === 'inactive') {
    conditions.push('is_active = 0');
  }

  const keyword = searchKeyword.trim();
  if (keyword !== '') {
    conditions.push('(name LIKE ? OR phone_number LIKE ?)');
    const pattern = `%${keyword}%`;
    params.push(pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT id, name, phone_number, notes, is_active, created_at, updated_at
    FROM ${TABLE_NAME}
    ${whereClause}
    ORDER BY updated_at DESC;
  `;

  const rows = await db.getAllAsync<EmployeeCacheRow>(query, params);
  return rows.map(mapRowToEmployeeItem);
}
