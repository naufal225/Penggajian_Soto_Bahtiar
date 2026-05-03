import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { WageReportData } from '@/services/report/wage-report-data-service';

export interface WageReportPdfInput {
  businessName: string;
  report: WageReportData;
}

export interface GeneratedPdfResult {
  fileName: string;
  fileUri: string;
  createdAt: string;
  savedToDownloads: boolean;
  downloadUri: string | null;
}

const DOWNLOAD_DIRECTORY_URI_KEY = 'penggajian_download_directory_uri';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(value: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
}

function formatDateLabel(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTimeLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapPaymentStatusLabel(employee: WageReportData['rows'][number]): string {
  return employee.paymentStatus === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar';
}

function formatFileDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '00-00-0000';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function buildFileName(generatedAt: string): string {
  return `Reporting-Gaji-${formatFileDate(generatedAt)}.pdf`;
}

function withTimestamp(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${fileName}-${Date.now()}`;
  }

  return `${fileName.slice(0, dotIndex)}-${Date.now()}${fileName.slice(dotIndex)}`;
}

async function getPersistedDownloadDirectoryUri(): Promise<string | null> {
  return SecureStore.getItemAsync(DOWNLOAD_DIRECTORY_URI_KEY);
}

async function persistDownloadDirectoryUri(uri: string): Promise<void> {
  await SecureStore.setItemAsync(DOWNLOAD_DIRECTORY_URI_KEY, uri);
}

async function clearPersistedDownloadDirectoryUri(): Promise<void> {
  await SecureStore.deleteItemAsync(DOWNLOAD_DIRECTORY_URI_KEY);
}

async function ensureAndroidDownloadDirectoryUri(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const existing = await getPersistedDownloadDirectoryUri();
  if (existing) {
    try {
      await FileSystemLegacy.StorageAccessFramework.readDirectoryAsync(existing);
      return existing;
    } catch {
      await clearPersistedDownloadDirectoryUri();
    }
  }

  const initialUri = FileSystemLegacy.StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permission = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
  if (!permission.granted || !permission.directoryUri) {
    return null;
  }

  if (!permission.directoryUri.includes('Download')) {
    throw new Error('DOWNLOAD_DIRECTORY_REQUIRED');
  }

  await persistDownloadDirectoryUri(permission.directoryUri);
  return permission.directoryUri;
}

async function copyPdfToAndroidDownloads(localFileUri: string, fileName: string): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const directoryUri = await ensureAndroidDownloadDirectoryUri();
  if (!directoryUri) {
    return null;
  }

  const base64 = await FileSystemLegacy.readAsStringAsync(localFileUri, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });

  const tryCreate = async (targetName: string): Promise<string> => {
    const downloadFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(directoryUri, targetName, 'application/pdf');
    await FileSystemLegacy.writeAsStringAsync(downloadFileUri, base64, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return downloadFileUri;
  };

  try {
    return await tryCreate(fileName);
  } catch {
    return tryCreate(withTimestamp(fileName));
  }
}

function buildEmployeeRowsHtml(employees: WageReportData['rows']): string {
  return employees
    .map((employee, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(employee.employeeName)}</td>
          <td>${employee.filledDays}</td>
          <td>${formatCurrency(employee.totalAmount)}</td>
          <td>${formatCurrency(employee.paidAmount)}</td>
          <td>${formatCurrency(employee.unpaidAmount)}</td>
          <td>${mapPaymentStatusLabel(employee)}</td>
        </tr>
      `;
    })
    .join('');
}

function buildReportHtml(input: WageReportPdfInput, generatedAt: string): string {
  const { businessName, report } = input;

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <style>
          @page {
            margin: 24px;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Helvetica, Arial, sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.45;
          }

          .header {
            margin-bottom: 20px;
          }

          .title {
            font-size: 22px;
            font-weight: bold;
            margin: 0 0 4px;
          }

          .subtitle,
          .meta {
            margin: 0;
            color: #475569;
          }

          .summary-grid {
            width: 100%;
            margin: 18px 0 16px;
            border-collapse: separate;
            border-spacing: 8px;
          }

          .summary-card {
            width: 33.33%;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            padding: 10px 12px;
            vertical-align: top;
          }

          .summary-label {
            display: block;
            color: #1d4ed8;
            font-size: 11px;
            margin-bottom: 4px;
          }

          .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
          }

          .section-title {
            font-size: 15px;
            font-weight: bold;
            margin: 18px 0 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead th {
            background: #dbeafe;
            color: #1e3a8a;
            font-size: 11px;
            text-align: left;
            padding: 9px 8px;
            border: 1px solid #bfdbfe;
          }

          tbody td {
            padding: 8px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .footer {
            margin-top: 18px;
            color: #64748b;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="title">Laporan Gaji</p>
          <p class="subtitle">${escapeHtml(businessName)}</p>
          <p class="meta">Periode: ${escapeHtml(formatDateLabel(report.startDate))} s/d ${escapeHtml(formatDateLabel(report.endDate))}</p>
          <p class="meta">Sumber Data: ${escapeHtml(report.sourceLabel)}</p>
          <p class="meta">Dibuat pada: ${escapeHtml(formatDateTimeLabel(generatedAt))}</p>
        </div>

        <table class="summary-grid" role="presentation">
          <tr>
            <td class="summary-card">
              <span class="summary-label">Total Gaji Rentang Ini</span>
              <span class="summary-value">${formatCurrency(report.totalAmount)}</span>
            </td>
            <td class="summary-card">
              <span class="summary-label">Jumlah Yang Sudah Dibayar</span>
              <span class="summary-value">${formatCurrency(report.totalPaidAmount)}</span>
            </td>
            <td class="summary-card">
              <span class="summary-label">Jumlah Karyawan Tercatat</span>
              <span class="summary-value">${report.employeeCount}</span>
            </td>
          </tr>
          <tr>
            <td class="summary-card">
              <span class="summary-label">Hari Gaji Terisi</span>
              <span class="summary-value">${report.filledWageCount}</span>
            </td>
            <td class="summary-card">
              <span class="summary-label">Karyawan Sudah Dibayar</span>
              <span class="summary-value">${report.paidEmployeeCount}</span>
            </td>
            <td class="summary-card">
              <span class="summary-label">Karyawan Belum Dibayar</span>
              <span class="summary-value">${report.unpaidEmployeeCount}</span>
            </td>
          </tr>
        </table>

        <p class="section-title">Rincian Karyawan</p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Karyawan</th>
              <th>Hari Terisi</th>
              <th>Total Gaji</th>
              <th>Sudah Dibayar</th>
              <th>Sisa Dibayar</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${buildEmployeeRowsHtml(report.rows)}
          </tbody>
        </table>

        <p class="footer">Laporan ini dibuat dari data gaji yang tersedia di aplikasi mobile.</p>
      </body>
    </html>
  `;
}

export async function generateWeeklyWageReportPdf(input: WageReportPdfInput): Promise<GeneratedPdfResult> {
  const generatedAt = new Date().toISOString();
  const html = buildReportHtml(input, generatedAt);
  const printResult = await Print.printToFileAsync({
    html,
    margins: {
      left: 24,
      top: 24,
      right: 24,
      bottom: 24,
    },
  });

  const reportsDirectory = new Directory(Paths.document, 'laporan-gaji');
  reportsDirectory.create({
    idempotent: true,
    intermediates: true,
  });

  const fileName = buildFileName(generatedAt);
  const generatedFile = new File(printResult.uri);
  const destinationFile = new File(reportsDirectory, fileName);

  if (destinationFile.exists) {
    destinationFile.delete();
  }

  generatedFile.copy(destinationFile);

  if (generatedFile.exists) {
    generatedFile.delete();
  }

  const downloadUri = await copyPdfToAndroidDownloads(destinationFile.uri, fileName);

  return {
    fileName,
    fileUri: destinationFile.uri,
    createdAt: generatedAt,
    savedToDownloads: downloadUri !== null,
    downloadUri,
  };
}

export async function isPdfSharingAvailable(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

export async function sharePdfFile(fileUri: string): Promise<void> {
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Bagikan Laporan Gaji',
    UTI: 'com.adobe.pdf',
  });
}
