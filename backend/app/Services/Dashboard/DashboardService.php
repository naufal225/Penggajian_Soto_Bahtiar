<?php

namespace App\Services\Dashboard;

use App\DTOs\Dashboard\DashboardSummaryResponseDTO;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Services\WeekPeriod\WeekPeriodService;
use Carbon\CarbonImmutable;

class DashboardService
{
    public function __construct(
        private readonly EmployeeRepositoryInterface $employeeRepository,
        private readonly DailyWageRepositoryInterface $dailyWageRepository,
        private readonly WeekPeriodService $weekPeriodService,
    ) {
    }

    public function getSummary(string $ownerName): DashboardSummaryResponseDTO
    {
        $activeEmployeeCount = $this->employeeRepository->countActive();
        $todayDate = CarbonImmutable::now()->format('Y-m-d');
        $todayTotalAmount = $this->dailyWageRepository->sumAmountByDate($todayDate);
        $todayFilledCount = $this->dailyWageRepository->countFilledByDate($todayDate);
        $todayUnfilledCount = max(0, $activeEmployeeCount - $todayFilledCount);
        $currentWeek = $this->weekPeriodService->resolveCurrentWeek();
        $weekSummary = $this->weekPeriodService->buildSummary($currentWeek);

        return new DashboardSummaryResponseDTO(
            todayDate: $todayDate,
            ownerName: $ownerName,
            todayTotalAmount: $todayTotalAmount,
            activeEmployeeCount: $activeEmployeeCount,
            todayFilledCount: $todayFilledCount,
            todayUnfilledCount: $todayUnfilledCount,
            currentWeek: [
                'id' => $currentWeek->id,
                'start_date' => (string) $currentWeek->start_date?->format('Y-m-d'),
                'end_date' => (string) $currentWeek->end_date?->format('Y-m-d'),
                'status' => $currentWeek->status->value,
                'is_locked' => $currentWeek->locked_at !== null,
                'total_amount' => (int) $weekSummary['total_amount'],
                'paid_employee_count' => (int) $weekSummary['paid_employee_count'],
                'unpaid_employee_count' => (int) $weekSummary['unpaid_employee_count'],
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
