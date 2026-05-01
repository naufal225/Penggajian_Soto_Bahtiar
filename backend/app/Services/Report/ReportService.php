<?php

namespace App\Services\Report;

use App\Exceptions\WeekPeriodNotFoundException;
use App\Services\WeekPeriod\WeekPeriodService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Storage;

class ReportService
{
    public function __construct(
        private readonly WeekPeriodService $weekPeriodService
    ) {
    }

    /**
     * @return array{
     *     file_name: string,
     *     download_url: string,
     *     expires_at: string
     * }
     *
     * @throws WeekPeriodNotFoundException
     */
    public function generateWeeklySummaryPdf(int $weekPeriodId): array
    {
        $detail = $this->weekPeriodService->getWeekDetail($weekPeriodId);
        $week = $detail['week'];
        $summary = $detail['summary'];
        $employees = $detail['employees'];
        $fileName = sprintf(
            'ringkasan-gaji-%s_%s.pdf',
            (string) $week->start_date?->format('Y-m-d'),
            (string) $week->end_date?->format('Y-m-d')
        );

        $lines = [
            'Ringkasan Gaji Mingguan - Soto Bahtiar',
            sprintf('Periode: %s s/d %s', (string) $week->start_date?->format('Y-m-d'), (string) $week->end_date?->format('Y-m-d')),
            sprintf('Status Minggu: %s', $week->status->value),
            sprintf('Total Minggu: Rp %s', number_format((int) $summary['total_amount'], 0, ',', '.')),
            sprintf('Karyawan Aktif: %d', (int) $summary['employee_count']),
            sprintf('Sudah Dibayar: %d', (int) $summary['paid_employee_count']),
            sprintf('Belum Dibayar: %d', (int) $summary['unpaid_employee_count']),
            '------------------------------',
        ];

        foreach ($employees as $employee) {
            $lines[] = sprintf(
                '%s | Hari: %d | Total: Rp %s | %s',
                (string) $employee['employee_name'],
                (int) $employee['filled_days'],
                number_format((int) $employee['total_amount'], 0, ',', '.'),
                $employee['payment_status'] === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'
            );
        }

        $pdfContent = $this->buildSimplePdf($lines);
        Storage::disk('public')->put("reports/{$fileName}", $pdfContent);

        return [
            'file_name' => $fileName,
            'download_url' => url("/storage/reports/{$fileName}"),
            'expires_at' => CarbonImmutable::now()->addHours(2)->toISOString(),
        ];
    }

    /**
     * @param  list<string>  $lines
     */
    private function buildSimplePdf(array $lines): string
    {
        $content = '';
        $y = 800;

        foreach ($lines as $line) {
            $escaped = $this->escapePdfText($line);
            $content .= sprintf("BT /F1 12 Tf 40 %d Td (%s) Tj ET\n", $y, $escaped);
            $y -= 18;
            if ($y < 40) {
                break;
            }
        }

        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            sprintf("5 0 obj << /Length %d >> stream\n%sendstream endobj", strlen($content), $content),
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object."\n";
        }

        $xrefPosition = strlen($pdf);
        $pdf .= sprintf("xref\n0 %d\n", count($offsets));
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i < count($offsets); $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        $pdf .= sprintf(
            "trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF",
            count($offsets),
            $xrefPosition
        );

        return $pdf;
    }

    private function escapePdfText(string $text): string
    {
        $sanitized = preg_replace('/[^\x20-\x7E]/', '?', $text) ?? '';

        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\(', '\)'],
            $sanitized
        );
    }
}

