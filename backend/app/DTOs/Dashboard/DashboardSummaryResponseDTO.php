<?php

namespace App\DTOs\Dashboard;

class DashboardSummaryResponseDTO
{
    /**
     * @param  array{
     *     id: int,
     *     start_date: string,
     *     end_date: string,
     *     status: string,
     *     is_locked: bool,
     *     total_amount: int,
     *     paid_employee_count: int,
     *     unpaid_employee_count: int
     * }  $currentWeek
     * @param  array{
     *     server_time: string,
     *     recommended_pull_after: bool
     * }  $syncInfo
     * @param  array{
     *     can_input_today_wage: bool,
     *     can_process_payment: bool,
     *     can_export_current_week_pdf: bool
     * }  $quickActions
     */
    public function __construct(
        public readonly string $todayDate,
        public readonly string $ownerName,
        public readonly int $activeEmployeeCount,
        public readonly int $todayFilledCount,
        public readonly int $todayUnfilledCount,
        public readonly array $currentWeek,
        public readonly array $syncInfo,
        public readonly array $quickActions,
    ) {
    }

    /**
     * @return array{
     *     today_date: string,
     *     owner_name: string,
     *     active_employee_count: int,
     *     today_filled_count: int,
     *     today_unfilled_count: int,
     *     current_week: array{
     *         id: int,
     *         start_date: string,
     *         end_date: string,
     *         status: string,
     *         is_locked: bool,
     *         total_amount: int,
     *         paid_employee_count: int,
     *         unpaid_employee_count: int
     *     },
     *     sync_info: array{
     *         server_time: string,
     *         recommended_pull_after: bool
     *     },
     *     quick_actions: array{
     *         can_input_today_wage: bool,
     *         can_process_payment: bool,
     *         can_export_current_week_pdf: bool
     *     }
     * }
     */
    public function toArray(): array
    {
        return [
            'today_date' => $this->todayDate,
            'owner_name' => $this->ownerName,
            'active_employee_count' => $this->activeEmployeeCount,
            'today_filled_count' => $this->todayFilledCount,
            'today_unfilled_count' => $this->todayUnfilledCount,
            'current_week' => $this->currentWeek,
            'sync_info' => $this->syncInfo,
            'quick_actions' => $this->quickActions,
        ];
    }
}
