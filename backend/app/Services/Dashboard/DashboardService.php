<?php

namespace App\Services\Dashboard;

use App\DTOs\Dashboard\DashboardSummaryResponseDTO;
use App\Repositories\Contracts\DashboardRepositoryInterface;
use Carbon\CarbonImmutable;

class DashboardService
{
    public function __construct(
        private readonly DashboardRepositoryInterface $dashboardRepository
    ) {
    }

    public function getSummary(string $ownerName): DashboardSummaryResponseDTO
    {
        $activeEmployeeCount = $this->dashboardRepository->countActiveEmployees();
        $todayFilledCount = 0;
        $todayUnfilledCount = max(0, $activeEmployeeCount - $todayFilledCount);
        $currentDate = CarbonImmutable::now();
        $currentWeekStartDate = $currentDate->startOfWeek(CarbonImmutable::MONDAY)->toDateString();
        $currentWeekEndDate = $currentDate->endOfWeek(CarbonImmutable::SUNDAY)->toDateString();

        return new DashboardSummaryResponseDTO(
            todayDate: $currentDate->toDateString(),
            ownerName: $ownerName,
            activeEmployeeCount: $activeEmployeeCount,
            todayFilledCount: $todayFilledCount,
            todayUnfilledCount: $todayUnfilledCount,
            currentWeek: [
                'id' => 0,
                'start_date' => $currentWeekStartDate,
                'end_date' => $currentWeekEndDate,
                'status' => 'open',
                'is_locked' => false,
                'total_amount' => 0,
                'paid_employee_count' => 0,
                'unpaid_employee_count' => $activeEmployeeCount,
            ],
            syncInfo: [
                'server_time' => CarbonImmutable::now('UTC')->toISOString(),
                'recommended_pull_after' => true,
            ],
            quickActions: [
                'can_input_today_wage' => true,
                'can_process_payment' => $activeEmployeeCount > 0,
                'can_export_current_week_pdf' => true,
            ],
        );
    }
}
