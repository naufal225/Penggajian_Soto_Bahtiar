import { getDailyWageHistory } from '@/services/api/wage-api';
import { ApiClientError } from '@/services/api/http-client';
import { getCachedDailyWageHistoryRange } from '@/services/sqlite/wage-offline-store';
import type { DailyWageHistoryItem } from '@/types/wage';

export interface WageReportSummaryRow {
  employeeId: number;
  employeeName: string;
  filledDays: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentStatus: 'paid' | 'unpaid';
}

export interface WageReportData {
  startDate: string;
  endDate: string;
  sourceLabel: 'Server Terbaru' | 'Tersimpan di HP';
  totalAmount: number;
  totalPaidAmount: number;
  filledWageCount: number;
  employeeCount: number;
  paidEmployeeCount: number;
  unpaidEmployeeCount: number;
  rows: WageReportSummaryRow[];
}

function aggregateRows(startDate: string, endDate: string, items: DailyWageHistoryItem[], sourceLabel: WageReportData['sourceLabel']): WageReportData {
  const employeeMap = new Map<number, WageReportSummaryRow>();

  items.forEach((item) => {
    const employeeName = item.employee_name ?? 'Tanpa Nama';
    const current = employeeMap.get(item.employee_id) ?? {
      employeeId: item.employee_id,
      employeeName,
      filledDays: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      paymentStatus: 'unpaid' as const,
    };

    current.filledDays += 1;
    current.totalAmount += item.amount;
    if (item.is_paid) {
      current.paidAmount += item.amount;
    } else {
      current.unpaidAmount += item.amount;
    }
    current.paymentStatus = current.unpaidAmount > 0 ? 'unpaid' : 'paid';
    employeeMap.set(item.employee_id, current);
  });

  const rows = Array.from(employeeMap.values()).sort((left, right) => left.employeeName.localeCompare(right.employeeName, 'id'));
  const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const totalPaidAmount = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const paidEmployeeCount = rows.filter((row) => row.paymentStatus === 'paid').length;
  const unpaidEmployeeCount = rows.filter((row) => row.paymentStatus === 'unpaid').length;

  return {
    startDate,
    endDate,
    sourceLabel,
    totalAmount,
    totalPaidAmount,
    filledWageCount: items.length,
    employeeCount: rows.length,
    paidEmployeeCount,
    unpaidEmployeeCount,
    rows,
  };
}

async function fetchServerHistory(startDate: string, endDate: string): Promise<DailyWageHistoryItem[]> {
  const items: DailyWageHistoryItem[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await getDailyWageHistory(startDate, endDate, page, 100);
    items.push(...response.items);
    lastPage = response.meta.last_page;
    page += 1;
  } while (page <= lastPage);

  return items;
}

export async function loadWageReportData(startDate: string, endDate: string): Promise<WageReportData> {
  try {
    const items = await fetchServerHistory(startDate, endDate);
    return aggregateRows(startDate, endDate, items, 'Server Terbaru');
  } catch (error) {
    const normalizedError = error instanceof ApiClientError ? error : new ApiClientError('Terjadi masalah, coba lagi', 'UNKNOWN_ERROR');
    if (normalizedError.code !== 'NETWORK_ERROR' && normalizedError.code !== 'REQUEST_TIMEOUT') {
      throw normalizedError;
    }

    const cachedItems = await getCachedDailyWageHistoryRange(startDate, endDate);
    return aggregateRows(startDate, endDate, cachedItems, 'Tersimpan di HP');
  }
}
