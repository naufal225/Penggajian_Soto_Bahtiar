<?php

namespace App\Http\Controllers\Api\Mobile\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $summary = $this->dashboardService->getSummary(
            ownerName: (string) $request->user()->name
        );

        return ApiResponse::success(
            message: 'Dashboard berhasil diambil',
            data: $summary->toArray(),
        );
    }
}
