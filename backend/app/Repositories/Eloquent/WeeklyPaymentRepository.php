<?php

namespace App\Repositories\Eloquent;

use App\Models\WeeklyPayment;
use App\Repositories\Contracts\WeeklyPaymentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

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

