<?php

namespace App\Http\Controllers\Api\Mobile\WeekPeriod;

use App\DTOs\WeekPeriod\WeekPeriodSummaryDTO;
use App\Exceptions\WeekPeriodNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\WeekPeriod\ListWeekPeriodRequest;
use App\Services\WeekPeriod\WeekPeriodService;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class WeekPeriodController extends Controller
{
    public function __construct(
        private readonly WeekPeriodService $weekPeriodService
    ) {
    }

    public function current(): JsonResponse
    {
        $summary = $this->weekPeriodService->getCurrentWeekSummary();

        return ApiResponse::success(
            message: 'Minggu berjalan berhasil diambil',
            data: $summary->toArray(),
        );
    }

    public function index(ListWeekPeriodRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 10);
        $status = $validated['status'] ?? null;
        $paginator = $this->weekPeriodService->paginateWeeks($status, $page, $perPage);

        return ApiResponse::success(
            message: 'Riwayat minggu berhasil diambil',
            data: $paginator->items(),
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ]
        );
    }

    public function show(int $weekPeriodId): JsonResponse
    {
        try {
            $detail = $this->weekPeriodService->getWeekDetail($weekPeriodId);
        } catch (WeekPeriodNotFoundException) {
            return ApiResponse::error(
                message: 'Minggu tidak ditemukan',
                code: ApiErrorCode::WEEK_PERIOD_NOT_FOUND,
                status: 404,
            );
        }

        $week = $detail['week'];
        $summaryDto = new WeekPeriodSummaryDTO($week, $detail['summary']);
        $data = $summaryDto->toArray();
        $data['employees'] = $detail['employees'];

        return ApiResponse::success(
            message: 'Detail minggu berhasil diambil',
            data: $data,
        );
    }
}

