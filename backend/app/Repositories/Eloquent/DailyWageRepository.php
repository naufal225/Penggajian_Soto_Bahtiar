<?php

namespace App\Repositories\Eloquent;

use App\Models\DailyWage;
use App\Models\Employee;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DailyWageRepository implements DailyWageRepositoryInterface
{
    public function findById(int $dailyWageId): ?DailyWage
    {
        return DailyWage::query()
            ->with(['employee', 'weekPeriod', 'payment'])
            ->whereKey($dailyWageId)
            ->first();
    }

    public function findByClientUuid(string $clientUuid): ?DailyWage
    {
        return DailyWage::query()
            ->with(['employee', 'weekPeriod'])
            ->where('client_uuid', $clientUuid)
            ->first();
    }

    public function findByEmployeeAndDate(int $employeeId, string $wageDate): ?DailyWage
    {
        return DailyWage::query()
            ->with(['employee', 'weekPeriod', 'payment'])
            ->where('employee_id', $employeeId)
            ->whereDate('wage_date', $wageDate)
            ->first();
    }

    public function create(array $payload): DailyWage
    {
        return DailyWage::query()->create($payload)->load(['employee', 'weekPeriod', 'payment']);
    }

    public function update(DailyWage $dailyWage, array $payload): DailyWage
    {
        $dailyWage->fill($payload);
        $dailyWage->save();

        return $dailyWage->refresh()->load(['employee', 'weekPeriod', 'payment']);
    }

    public function countFilledByDate(string $date): int
    {
        return DailyWage::query()
            ->whereDate('wage_date', $date)
            ->distinct('employee_id')
            ->count('employee_id');
    }

    public function sumAmountByDate(string $date): int
    {
        return (int) DailyWage::query()
            ->whereDate('wage_date', $date)
            ->sum('amount');
    }

    public function listByDateAndActiveEmployees(string $date): Collection
    {
        return Employee::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->with(['dailyWages' => function ($query) use ($date): void {
                $query
                    ->whereDate('wage_date', $date)
                    ->with(['weekPeriod', 'payment']);
            }])
            ->get();
    }

    public function paginateHistory(array $filters, int $page, int $perPage): LengthAwarePaginator
    {
        $builder = DailyWage::query()
            ->with(['employee', 'weekPeriod', 'payment']);

        if (! empty($filters['employee_id'])) {
            $builder->where('employee_id', (int) $filters['employee_id']);
        }

        if (! empty($filters['start_date'])) {
            $builder->whereDate('wage_date', '>=', (string) $filters['start_date']);
        }

        if (! empty($filters['end_date'])) {
            $builder->whereDate('wage_date', '<=', (string) $filters['end_date']);
        }

        if (! empty($filters['week_period_id'])) {
            $builder->where('week_period_id', (int) $filters['week_period_id']);
        }

        return $builder
            ->orderByDesc('wage_date')
            ->orderByDesc('id')
            ->paginate(
                perPage: $perPage,
                columns: ['*'],
                pageName: 'page',
                page: $page
            );
    }

    public function findUnpaidByWeekAndEmployee(int $weekPeriodId, int $employeeId): Collection
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('employee_id', $employeeId)
            ->where('is_paid', false)
            ->orderBy('wage_date')
            ->lockForUpdate()
            ->get();
    }

    public function findUnpaidByWeek(int $weekPeriodId): Collection
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('is_paid', false)
            ->orderBy('employee_id')
            ->orderBy('wage_date')
            ->lockForUpdate()
            ->get();
    }

    public function findByWeekAndPayment(int $weekPeriodId, int $paymentId): Collection
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('paid_weekly_payment_id', $paymentId)
            ->orderBy('wage_date')
            ->get();
    }

    public function markAsPaid(array $dailyWageIds, int $paymentId, string $paidAt): int
    {
        if ($dailyWageIds === []) {
            return 0;
        }

        return DailyWage::query()
            ->whereIn('id', $dailyWageIds)
            ->update([
                'is_paid' => true,
                'paid_at' => $paidAt,
                'paid_weekly_payment_id' => $paymentId,
                'updated_at' => now(),
            ]);
    }

    public function markAsUnpaidByPaymentId(int $paymentId): int
    {
        return DailyWage::query()
            ->where('paid_weekly_payment_id', $paymentId)
            ->update([
                'is_paid' => false,
                'paid_at' => null,
                'paid_weekly_payment_id' => null,
                'updated_at' => now(),
            ]);
    }

    public function countByWeek(int $weekPeriodId): int
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->count();
    }

    public function countPaidByWeek(int $weekPeriodId): int
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('is_paid', true)
            ->count();
    }

    public function countDistinctPaidEmployeesByWeek(int $weekPeriodId): int
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('is_paid', true)
            ->distinct('employee_id')
            ->count('employee_id');
    }

    public function hasAnyPaidForEmployeeInWeek(int $employeeId, int $weekPeriodId): bool
    {
        return DailyWage::query()
            ->where('employee_id', $employeeId)
            ->where('week_period_id', $weekPeriodId)
            ->where('is_paid', true)
            ->exists();
    }

    public function hasAnyUnpaidForWeek(int $weekPeriodId): bool
    {
        return DailyWage::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('is_paid', false)
            ->exists();
    }

    public function hasAnyUnpaidForEmployeeInWeek(int $employeeId, int $weekPeriodId): bool
    {
        return DailyWage::query()
            ->where('employee_id', $employeeId)
            ->where('week_period_id', $weekPeriodId)
            ->where('is_paid', false)
            ->exists();
    }

    public function getWeekEmployeeAggregates(int $weekPeriodId): Collection
    {
        return DailyWage::query()
            ->select([
                'employee_id',
                DB::raw('SUM(amount) as total_amount'),
                DB::raw('SUM(CASE WHEN is_paid = 1 THEN amount ELSE 0 END) as paid_amount'),
                DB::raw('SUM(CASE WHEN is_paid = 0 THEN amount ELSE 0 END) as unpaid_amount'),
                DB::raw('COUNT(*) as filled_days'),
                DB::raw('MAX(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as has_paid'),
                DB::raw('SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid_rows'),
                DB::raw('SUM(CASE WHEN is_paid = 0 THEN 1 ELSE 0 END) as unpaid_rows'),
                DB::raw('MAX(paid_at) as paid_at'),
                DB::raw('MAX(updated_at) as updated_at'),
            ])
            ->where('week_period_id', $weekPeriodId)
            ->groupBy('employee_id')
            ->get();
    }

    public function getUpdatedSince(string $updatedSince): Collection
    {
        return DailyWage::query()
            ->with(['weekPeriod'])
            ->where('updated_at', '>=', $updatedSince)
            ->orderBy('updated_at')
            ->get();
    }
}
