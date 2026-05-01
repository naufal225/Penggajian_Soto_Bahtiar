<?php

namespace App\Services\WeekPeriod;

use App\DTOs\WeekPeriod\WeekPeriodSummaryDTO;
use App\Enums\WeekStatus;
use App\Exceptions\WeekPeriodNotFoundException;
use App\Models\WeekPeriod;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Repositories\Contracts\WeekPeriodRepositoryInterface;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;

class WeekPeriodService
{
    public function __construct(
        private readonly WeekPeriodRepositoryInterface $weekPeriodRepository,
        private readonly DailyWageRepositoryInterface $dailyWageRepository,
        private readonly EmployeeRepositoryInterface $employeeRepository,
    ) {
    }

    public function resolveCurrentWeek(): WeekPeriod
    {
        $existing = $this->weekPeriodRepository->findCurrentOpenWeek();
        if ($existing) {
            return $existing;
        }

        $today = CarbonImmutable::now()->format('Y-m-d');

        return $this->weekPeriodRepository->create(
            startDate: $today,
            endDate: $today,
        );
    }

    public function resolveWeekForDate(string $date): WeekPeriod
    {
        $existingByDate = $this->weekPeriodRepository->findByDate($date);
        if ($existingByDate) {
            return $existingByDate;
        }

        $current = $this->weekPeriodRepository->findCurrentOpenWeek();
        if (! $current) {
            return $this->weekPeriodRepository->create(
                startDate: $date,
                endDate: $date,
            );
        }

        $target = CarbonImmutable::createFromFormat('Y-m-d', $date);
        $start = CarbonImmutable::parse((string) $current->start_date);
        $end = CarbonImmutable::parse((string) $current->end_date);
        $changed = false;

        if ($target->lt($start)) {
            $current->start_date = $target->format('Y-m-d');
            $changed = true;
        }

        if ($target->gt($end)) {
            $current->end_date = $target->format('Y-m-d');
            $changed = true;
        }

        if ($changed) {
            $current = $this->weekPeriodRepository->save($current);
        }

        return $current;
    }

    /**
     * @throws WeekPeriodNotFoundException
     */
    public function getByIdOrFail(int $weekPeriodId): WeekPeriod
    {
        $week = $this->weekPeriodRepository->findById($weekPeriodId);
        if (! $week) {
            throw new WeekPeriodNotFoundException();
        }

        return $week;
    }

    /**
     * @return array{
     *     employee_count: int,
     *     filled_wage_count: int,
     *     total_amount: int,
     *     paid_employee_count: int,
     *     unpaid_employee_count: int
     * }
     */
    public function buildSummary(WeekPeriod $weekPeriod): array
    {
        $employeeCount = $this->employeeRepository->countActive();
        $filledWageCount = $this->dailyWageRepository->countByWeek($weekPeriod->id);
        $paidEmployeeCount = $this->dailyWageRepository->countDistinctPaidEmployeesByWeek($weekPeriod->id);
        $totalAmount = (int) $this->dailyWageRepository
            ->getWeekEmployeeAggregates($weekPeriod->id)
            ->sum('total_amount');

        return [
            'employee_count' => $employeeCount,
            'filled_wage_count' => $filledWageCount,
            'total_amount' => $totalAmount,
            'paid_employee_count' => $paidEmployeeCount,
            'unpaid_employee_count' => max(0, $employeeCount - $paidEmployeeCount),
        ];
    }

    public function refreshWeekStatus(WeekPeriod $weekPeriod): WeekPeriod
    {
        $totalRows = $this->dailyWageRepository->countByWeek($weekPeriod->id);
        $paidRows = $this->dailyWageRepository->countPaidByWeek($weekPeriod->id);

        $newStatus = WeekStatus::Open;
        if ($totalRows > 0 && $paidRows === $totalRows) {
            $newStatus = WeekStatus::FullyPaid;
        } elseif ($paidRows > 0) {
            $newStatus = WeekStatus::PartialPaid;
        }

        $weekPeriod->status = $newStatus;
        $weekPeriod->locked_at = $newStatus === WeekStatus::FullyPaid ? CarbonImmutable::now() : null;

        return $this->weekPeriodRepository->save($weekPeriod);
    }

    public function getCurrentWeekSummary(): WeekPeriodSummaryDTO
    {
        $week = $this->resolveCurrentWeek();
        $summary = $this->buildSummary($week);

        return new WeekPeriodSummaryDTO($week, $summary);
    }

    public function paginateWeeks(?string $status, int $page, int $perPage): LengthAwarePaginator
    {
        $paginator = $this->weekPeriodRepository->paginate($status, $page, $perPage);
        $items = collect($paginator->items())
            ->map(function (WeekPeriod $week): array {
                return (new WeekPeriodSummaryDTO(
                    weekPeriod: $week,
                    summary: $this->buildSummary($week)
                ))->toArray();
            })
            ->all();

        return new Paginator(
            items: $items,
            total: $paginator->total(),
            perPage: $paginator->perPage(),
            currentPage: $paginator->currentPage(),
            options: [
                'path' => request()->url(),
                'query' => request()->query(),
            ],
        );
    }

    /**
     * @return array{
     *     week: WeekPeriod,
     *     summary: array{
     *         employee_count: int,
     *         filled_wage_count: int,
     *         total_amount: int,
     *         paid_employee_count: int,
     *         unpaid_employee_count: int
     *     },
     *     employees: list<array<string, mixed>>
     * }
     *
     * @throws WeekPeriodNotFoundException
     */
    public function getWeekDetail(int $weekPeriodId): array
    {
        $week = $this->getByIdOrFail($weekPeriodId);
        $summary = $this->buildSummary($week);
        $aggregateRows = $this->dailyWageRepository->getWeekEmployeeAggregates($week->id)->keyBy('employee_id');
        $activeEmployees = $this->employeeRepository->getActiveEmployees();
        $activeIds = $activeEmployees->pluck('id')->all();
        $aggregateIds = $aggregateRows->keys()->map(fn ($id): int => (int) $id)->all();
        $employeeIds = array_values(array_unique(array_merge($activeIds, $aggregateIds)));
        $employees = $this->employeeRepository->getEmployeesByIds($employeeIds)->keyBy('id');

        $employeeItems = [];

        foreach ($employeeIds as $employeeId) {
            $employee = $employees->get($employeeId);
            if (! $employee) {
                continue;
            }

            $aggregate = $aggregateRows->get($employeeId);
            $filledDays = (int) ($aggregate->filled_days ?? 0);
            $totalAmount = (int) ($aggregate->total_amount ?? 0);
            $paidAmount = (int) ($aggregate->paid_amount ?? 0);
            $unpaidAmount = (int) ($aggregate->unpaid_amount ?? 0);
            $paidRows = (int) ($aggregate->paid_rows ?? 0);
            $unpaidRows = (int) ($aggregate->unpaid_rows ?? 0);
            $isPaid = $filledDays > 0 && $paidRows > 0 && $unpaidRows === 0;

            $employeeItems[] = [
                'employee_id' => $employee->id,
                'employee_name' => $employee->name,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'unpaid_amount' => $unpaidAmount,
                'filled_days' => $filledDays,
                'unpaid_days' => $unpaidRows,
                'can_pay_now' => $unpaidAmount > 0 && $week->locked_at === null,
                'payment_status' => $isPaid ? 'paid' : 'unpaid',
                'paid_at' => $isPaid && ! empty($aggregate->paid_at)
                    ? CarbonImmutable::parse((string) $aggregate->paid_at)->toISOString()
                    : null,
                'is_locked' => $week->locked_at !== null,
            ];
        }

        usort($employeeItems, fn (array $a, array $b): int => strcmp($a['employee_name'], $b['employee_name']));

        return [
            'week' => $week,
            'summary' => $summary,
            'employees' => $employeeItems,
        ];
    }

    public function isCurrentWeek(int $weekPeriodId): bool
    {
        return $this->resolveCurrentWeek()->id === $weekPeriodId;
    }
}
