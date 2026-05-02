<?php

namespace App\Repositories\Eloquent;

use App\Models\WeeklyPayment;
use App\Repositories\Contracts\WeeklyPaymentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class WeeklyPaymentRepository implements WeeklyPaymentRepositoryInterface
{
    public function create(array $payload): WeeklyPayment
    {
        return WeeklyPayment::query()->create($payload)->load(['employee', 'weekPeriod', 'dailyWages']);
    }

    public function findById(int $paymentId): ?WeeklyPayment
    {
        return WeeklyPayment::query()
            ->with(['employee', 'weekPeriod', 'dailyWages'])
            ->whereKey($paymentId)
            ->first();
    }

    public function paginate(?int $weekPeriodId, int $page, int $perPage): LengthAwarePaginator
    {
        $builder = WeeklyPayment::query()
            ->with(['employee'])
            ->where('is_voided', false);

        if ($weekPeriodId !== null) {
            $builder->where('week_period_id', $weekPeriodId);
        }

        return $builder
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->paginate(
                perPage: $perPage,
                columns: ['*'],
                pageName: 'page',
                page: $page
            );
    }

    public function paginateHistoryCards(?int $weekPeriodId, int $page, int $perPage): LengthAwarePaginator
    {
        $builder = DB::table('daily_wages')
            ->join('weekly_payments', 'daily_wages.paid_weekly_payment_id', '=', 'weekly_payments.id')
            ->leftJoin('employees', 'daily_wages.employee_id', '=', 'employees.id')
            ->where('weekly_payments.is_voided', false)
            ->selectRaw('weekly_payments.id as payment_id')
            ->selectRaw('weekly_payments.week_period_id as week_period_id')
            ->selectRaw('daily_wages.employee_id as employee_id')
            ->selectRaw('employees.name as employee_name')
            ->selectRaw('weekly_payments.payment_scope as payment_scope')
            ->selectRaw('SUM(daily_wages.amount) as total_amount')
            ->selectRaw('weekly_payments.paid_at as paid_at')
            ->selectRaw('weekly_payments.notes as notes')
            ->groupBy(
                'weekly_payments.id',
                'weekly_payments.week_period_id',
                'daily_wages.employee_id',
                'employees.name',
                'weekly_payments.payment_scope',
                'weekly_payments.paid_at',
                'weekly_payments.notes',
            );

        if ($weekPeriodId !== null) {
            $builder->where('weekly_payments.week_period_id', $weekPeriodId);
        }

        return $builder
            ->orderByDesc('weekly_payments.paid_at')
            ->orderBy('employees.name')
            ->paginate(
                perPage: $perPage,
                columns: ['*'],
                pageName: 'page',
                page: $page
            );
    }

    public function findEmployeePaymentInWeek(int $weekPeriodId, int $employeeId): ?WeeklyPayment
    {
        return WeeklyPayment::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('employee_id', $employeeId)
            ->where('payment_scope', 'employee')
            ->where('is_voided', false)
            ->first();
    }

    public function findAllScopePaymentInWeek(int $weekPeriodId): ?WeeklyPayment
    {
        return WeeklyPayment::query()
            ->where('week_period_id', $weekPeriodId)
            ->where('payment_scope', 'all')
            ->where('is_voided', false)
            ->first();
    }

    public function getUpdatedSince(string $updatedSince): Collection
    {
        return WeeklyPayment::query()
            ->where('updated_at', '>=', $updatedSince)
            ->orderBy('updated_at')
            ->get();
    }

    public function save(WeeklyPayment $payment): WeeklyPayment
    {
        $payment->save();

        return $payment->refresh()->load(['employee', 'weekPeriod', 'dailyWages']);
    }
}
