<?php

namespace App\Repositories\Contracts;

use App\Models\DailyWage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface DailyWageRepositoryInterface
{
    public function findById(int $dailyWageId): ?DailyWage;

    public function findByClientUuid(string $clientUuid): ?DailyWage;

    public function findByEmployeeAndDate(int $employeeId, string $wageDate): ?DailyWage;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(array $payload): DailyWage;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function update(DailyWage $dailyWage, array $payload): DailyWage;

    public function countFilledByDate(string $date): int;

    public function sumAmountByDate(string $date): int;

    public function listByDateAndActiveEmployees(string $date): Collection;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateHistory(array $filters, int $page, int $perPage): LengthAwarePaginator;

    public function findUnpaidByWeekAndEmployee(int $weekPeriodId, int $employeeId): Collection;

    public function findUnpaidByWeek(int $weekPeriodId): Collection;

    public function findByWeekAndPayment(int $weekPeriodId, int $paymentId): Collection;

    /**
     * @param  list<int>  $dailyWageIds
     */
    public function markAsPaid(array $dailyWageIds, int $paymentId, string $paidAt): int;

    public function markAsUnpaidByPaymentId(int $paymentId): int;

    public function countByWeek(int $weekPeriodId): int;

    public function countPaidByWeek(int $weekPeriodId): int;

    public function countDistinctPaidEmployeesByWeek(int $weekPeriodId): int;

    public function hasAnyPaidForEmployeeInWeek(int $employeeId, int $weekPeriodId): bool;

    public function hasAnyUnpaidForWeek(int $weekPeriodId): bool;

    public function hasAnyUnpaidForEmployeeInWeek(int $employeeId, int $weekPeriodId): bool;

    public function getWeekEmployeeAggregates(int $weekPeriodId): Collection;

    public function getUpdatedSince(string $updatedSince): Collection;
}
