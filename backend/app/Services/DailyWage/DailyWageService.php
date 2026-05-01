<?php

namespace App\Services\DailyWage;

use App\DTOs\DailyWage\DailyWageResponseDTO;
use App\Exceptions\DailyWageDuplicateException;
use App\Exceptions\DailyWageLockedException;
use App\Exceptions\DailyWageNotFoundException;
use App\Exceptions\EmployeeInactiveException;
use App\Exceptions\EmployeeNotFoundException;
use App\Exceptions\ForbiddenActionException;
use App\Models\DailyWage;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Services\WeekPeriod\WeekPeriodService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;

class DailyWageService
{
    public function __construct(
        private readonly DailyWageRepositoryInterface $dailyWageRepository,
        private readonly EmployeeRepositoryInterface $employeeRepository,
        private readonly WeekPeriodService $weekPeriodService,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getByDate(string $date): array
    {
        $weekPeriod = $this->weekPeriodService->resolveWeekForDate($date);
        $employees = $this->dailyWageRepository->listByDateAndActiveEmployees($date);

        $items = $employees->map(function ($employee): array {
            /** @var DailyWage|null $dailyWage */
            $dailyWage = $employee->dailyWages->first();

            return [
                'employee_id' => $employee->id,
                'employee_name' => $employee->name,
                'daily_wage' => $dailyWage ? [
                    'id' => $dailyWage->id,
                    'amount' => (int) $dailyWage->amount,
                    'notes' => $dailyWage->notes,
                    'is_paid' => (bool) $dailyWage->is_paid,
                    'is_locked' => (bool) $dailyWage->is_paid,
                    'wage_date' => (string) $dailyWage->wage_date?->format('Y-m-d'),
                    'updated_at' => $dailyWage->updated_at?->toISOString(),
                ] : null,
            ];
        })->all();

        return [
            'date' => $date,
            'week_period' => [
                'id' => $weekPeriod->id,
                'start_date' => (string) $weekPeriod->start_date?->format('Y-m-d'),
                'end_date' => (string) $weekPeriod->end_date?->format('Y-m-d'),
                'status' => $weekPeriod->status->value,
                'is_locked' => $weekPeriod->locked_at !== null,
            ],
            'employees' => $items,
        ];
    }

    /**
     * @param  array{
     *     employee_id: int,
     *     wage_date: string,
     *     amount: int,
     *     notes?: string|null,
     *     client_uuid?: string|null
     * }  $payload
     *
     * @throws DailyWageDuplicateException
     * @throws DailyWageLockedException
     * @throws EmployeeInactiveException
     * @throws EmployeeNotFoundException
     * @throws ForbiddenActionException
     */
    public function create(array $payload, int $createdByUserId): DailyWage
    {
        $employee = $this->employeeRepository->findById($payload['employee_id']);
        if (! $employee) {
            throw new EmployeeNotFoundException();
        }

        if (! $employee->is_active) {
            throw new EmployeeInactiveException();
        }

        if (! empty($payload['client_uuid'])) {
            $existingByClient = $this->dailyWageRepository->findByClientUuid((string) $payload['client_uuid']);
            if ($existingByClient) {
                return $existingByClient;
            }
        }

        $duplicate = $this->dailyWageRepository->findByEmployeeAndDate($payload['employee_id'], $payload['wage_date']);
        if ($duplicate) {
            throw new DailyWageDuplicateException();
        }

        $weekPeriod = $this->weekPeriodService->resolveWeekForDate($payload['wage_date']);
        $this->ensureWeekEditable($weekPeriod->id);

        try {
            $created = $this->dailyWageRepository->create([
                'employee_id' => $payload['employee_id'],
                'week_period_id' => $weekPeriod->id,
                'wage_date' => $payload['wage_date'],
                'amount' => $payload['amount'],
                'notes' => $payload['notes'] ?? null,
                'is_paid' => false,
                'paid_at' => null,
                'paid_weekly_payment_id' => null,
                'created_by_user_id' => $createdByUserId,
                'updated_by_user_id' => $createdByUserId,
                'client_uuid' => $payload['client_uuid'] ?? null,
            ]);
        } catch (QueryException $exception) {
            if ($this->isDuplicateConstraintError($exception)) {
                throw new DailyWageDuplicateException();
            }

            throw $exception;
        }

        $this->weekPeriodService->refreshWeekStatus($weekPeriod);

        return $created;
    }

    /**
     * @param  array{
     *     amount: int,
     *     notes?: string|null
     * }  $payload
     *
     * @throws DailyWageLockedException
     * @throws DailyWageNotFoundException
     * @throws ForbiddenActionException
     */
    public function update(int $dailyWageId, array $payload, int $updatedByUserId): DailyWage
    {
        $dailyWage = $this->dailyWageRepository->findById($dailyWageId);
        if (! $dailyWage) {
            throw new DailyWageNotFoundException();
        }

        $this->ensureWeekEditable($dailyWage->week_period_id);
        $this->ensureEmployeeWeekUnlocked($dailyWage->week_period_id, $dailyWage);

        return $this->dailyWageRepository->update($dailyWage, [
            'amount' => $payload['amount'],
            'notes' => $payload['notes'] ?? null,
            'updated_by_user_id' => $updatedByUserId,
        ]);
    }

    /**
     * @throws DailyWageNotFoundException
     */
    public function getDetail(int $dailyWageId): DailyWage
    {
        $dailyWage = $this->dailyWageRepository->findById($dailyWageId);
        if (! $dailyWage) {
            throw new DailyWageNotFoundException();
        }

        return $dailyWage;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function getHistory(array $filters, int $page, int $perPage): LengthAwarePaginator
    {
        $paginator = $this->dailyWageRepository->paginateHistory($filters, $page, $perPage);
        $items = collect($paginator->items())
            ->map(fn (DailyWage $dailyWage): array => [
                'id' => $dailyWage->id,
                'employee_id' => $dailyWage->employee_id,
                'employee_name' => optional($dailyWage->employee)->name,
                'week_period_id' => $dailyWage->week_period_id,
                'wage_date' => (string) $dailyWage->wage_date?->format('Y-m-d'),
                'amount' => (int) $dailyWage->amount,
                'is_paid' => (bool) $dailyWage->is_paid,
                'is_locked' => (bool) $dailyWage->is_paid,
                'updated_at' => $dailyWage->updated_at?->toISOString(),
            ])
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
     * @param  array<string, mixed>  $payload
     */
    public function syncCreate(array $payload, ?string $clientUuid, int $userId): DailyWage
    {
        return $this->create([
            'employee_id' => (int) ($payload['employee_id'] ?? 0),
            'wage_date' => (string) ($payload['wage_date'] ?? ''),
            'amount' => (int) ($payload['amount'] ?? 0),
            'notes' => array_key_exists('notes', $payload) ? ($payload['notes'] !== null ? (string) $payload['notes'] : null) : null,
            'client_uuid' => $clientUuid,
        ], $userId);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function syncUpdate(int $dailyWageId, array $payload, int $userId): DailyWage
    {
        return $this->update($dailyWageId, [
            'amount' => (int) ($payload['amount'] ?? 0),
            'notes' => array_key_exists('notes', $payload) ? ($payload['notes'] !== null ? (string) $payload['notes'] : null) : null,
        ], $userId);
    }

    /**
     * @throws DailyWageLockedException
     */
    private function ensureEmployeeWeekUnlocked(int $weekPeriodId, ?DailyWage $currentDailyWage): void
    {
        if ($currentDailyWage?->is_paid === true) {
            throw new DailyWageLockedException([
                'week_period_id' => $weekPeriodId,
                'paid_at' => $currentDailyWage->paid_at?->toISOString(),
            ]);
        }
    }

    /**
     * @throws DailyWageLockedException
     * @throws ForbiddenActionException
     */
    private function ensureWeekEditable(int $weekPeriodId): void
    {
        if (! $this->weekPeriodService->isCurrentWeek($weekPeriodId)) {
            throw new ForbiddenActionException();
        }
    }

    private function isDuplicateConstraintError(QueryException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'unique')
            && str_contains($message, 'daily_wages');
    }

    public function toResponse(DailyWage $dailyWage): array
    {
        return (new DailyWageResponseDTO($dailyWage))->toArray();
    }
}
