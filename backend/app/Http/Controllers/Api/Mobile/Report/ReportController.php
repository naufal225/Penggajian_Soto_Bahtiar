<?php

namespace App\Http\Controllers\Api\Mobile\Report;

use App\Exceptions\WeekPeriodNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\Report\WeeklySummaryPdfRequest;
use App\Services\Report\ReportService;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reportService
    ) {
    }

    public function weeklySummaryPdf(WeeklySummaryPdfRequest $request): JsonResponse
    {
        try {
            $data = $this->reportService->generateWeeklySummaryPdf(
                weekPeriodId: (int) $request->validated('week_period_id')
            );
        } catch (WeekPeriodNotFoundException) {
            return ApiResponse::error(
                message: 'Minggu tidak ditemukan',
                code: ApiErrorCode::WEEK_PERIOD_NOT_FOUND,
                status: 404,
            );
        }

        return ApiResponse::success(
            message: 'PDF berhasil dibuat',
            data: $data,
        );
    }
}

