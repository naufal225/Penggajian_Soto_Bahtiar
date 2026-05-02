<?php

namespace App\Repositories\Contracts;

use App\Models\WeeklyPayment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface WeeklyPaymentRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(array $payload): WeeklyPayment;

    public function findById(int $paymentId): ?WeeklyPayment;

    public function paginate(?int $weekPeriodId, int $page, int $perPage): LengthAwarePaginator;

    public function paginateHistoryCards(?int $weekPeriodId, int $page, int $perPage): LengthAwarePaginator;

    public function findEmployeePaymentInWeek(int $weekPeriodId, int $employeeId): ?WeeklyPayment;

    public function findAllScopePaymentInWeek(int $weekPeriodId): ?WeeklyPayment;

    public function getUpdatedSince(string $updatedSince): Collection;

    public function save(WeeklyPayment $payment): WeeklyPayment;
}
