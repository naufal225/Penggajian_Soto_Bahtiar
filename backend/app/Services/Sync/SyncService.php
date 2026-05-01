<?php

namespace App\Services\Sync;

use App\DTOs\Sync\SyncPushResultDTO;
use App\Enums\SyncResultStatus;
use App\Exceptions\DailyWageDuplicateException;
use App\Exceptions\DailyWageLockedException;
use App\Exceptions\DailyWageNotFoundException;
use App\Exceptions\EmployeeInactiveException;
use App\Exceptions\EmployeeNotFoundException;
use App\Exceptions\ForbiddenActionException;
use App\Exceptions\PaymentAlreadyCompletedException;
use App\Exceptions\PaymentNotFoundException;
use App\Exceptions\WeekAlreadyFullyPaidException;
use App\Exceptions\WeekPeriodNotFoundException;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Repositories\Contracts\MobileSyncHistoryRepositoryInterface;
use App\Repositories\Contracts\WeekPeriodRepositoryInterface;
use App\Repositories\Contracts\WeeklyPaymentRepositoryInterface;
use App\Services\DailyWage\DailyWageService;
use App\Services\WeeklyPayment\WeeklyPaymentService;
use App\Support\ApiErrorCode;
use Carbon\CarbonImmutable;
use Throwable;

class SyncService
{
    public function __construct(
        private readonly DailyWageService $dailyWageService,
        private readonly MobileSyncHistoryRepositoryInterface $syncHistoryRepository,
        private readonly EmployeeRepositoryInterface $employeeRepository,
        private readonly WeekPeriodRepositoryInterface $weekPeriodRepository,
        private readonly DailyWageRepositoryInterface $dailyWageRepository,
        private readonly WeeklyPaymentRepositoryInterface $weeklyPaymentRepository,
        private readonly WeeklyPaymentService $weeklyPaymentService,
    ) {
    }

    /**
     * @param  array<int, array<string, mixed>>  $changes
     * @return array<string, mixed>
     */
    public function push(string $deviceId, array $changes, int $userId): array
    {
        $results = [];
        $hasConflict = false;
        $hasFailed = false;

        foreach ($changes as $change) {
            $entity = (string) ($change['entity'] ?? '');
            $action = (string) ($change['action'] ?? '');
            $clientUuid = ! empty($change['client_uuid']) ? (string) $change['client_uuid'] : null;
            $serverId = isset($change['server_id']) ? (int) $change['server_id'] : null;
            $payload = is_array($change['payload'] ?? null) ? $change['payload'] : [];

            try {
                $result = $this->processChange(
                    entity: $entity,
                    action: $action,
                    clientUuid: $clientUuid,
                    serverId: $serverId,
                    payload: $payload,
                    userId: $userId,
                );
            } catch (DailyWageLockedException|ForbiddenActionException) {
                $hasConflict = true;
                $result = new SyncPushResultDTO(
                    status: SyncResultStatus::Conflict->value,
                    entity: $entity,
                    action: $action,
                    clientUuid: $clientUuid,
                    serverId: $serverId,
                    error: [
                        'code' => ApiErrorCode::SYNC_CONFLICT,
                        'message' => 'Data tidak dapat diperbarui karena sudah terkunci',
                    ],
                );
            } catch (DailyWageNotFoundException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::DAILY_WAGE_NOT_FOUND, 'Data gaji harian tidak ditemukan');
            } catch (EmployeeNotFoundException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::EMPLOYEE_NOT_FOUND, 'Karyawan tidak ditemukan');
            } catch (WeekPeriodNotFoundException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::WEEK_PERIOD_NOT_FOUND, 'Minggu tidak ditemukan');
            } catch (EmployeeInactiveException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::EMPLOYEE_INACTIVE, 'Karyawan sudah nonaktif');
            } catch (DailyWageDuplicateException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::DAILY_WAGE_DUPLICATE, 'Data gaji harian duplikat');
            } catch (PaymentAlreadyCompletedException|WeekAlreadyFullyPaidException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::PAYMENT_ALREADY_COMPLETED, 'Tidak ada sisa gaji untuk dibayar');
            } catch (PaymentNotFoundException) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::PAYMENT_NOT_FOUND, 'Pembayaran tidak ditemukan');
            } catch (Throwable $exception) {
                $hasFailed = true;
                $result = $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::INTERNAL_SERVER_ERROR, 'Gagal memproses perubahan');
            }

            if ($result->status === SyncResultStatus::Failed->value) {
                $hasFailed = true;
            }

            if ($result->status === SyncResultStatus::Conflict->value) {
                $hasConflict = true;
            }

            $results[] = $result->toArray();
            $this->syncHistoryRepository->create([
                'device_id' => $deviceId,
                'action_type' => $action,
                'entity_type' => $entity,
                'entity_local_id' => $clientUuid,
                'entity_server_id' => $result->serverId,
                'sync_status' => $result->status,
                'error_message' => $result->error['message'] ?? null,
                'synced_at' => CarbonImmutable::now()->toDateTimeString(),
            ]);
        }

        $message = 'Sinkronisasi push selesai';
        if ($hasConflict || $hasFailed) {
            $message = 'Sinkronisasi push selesai dengan beberapa konflik';
        }

        return [
            'processed' => count($changes),
            'results' => $results,
            'message' => $message,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function processChange(
        string $entity,
        string $action,
        ?string $clientUuid,
        ?int $serverId,
        array $payload,
        int $userId
    ): SyncPushResultDTO {
        if ($entity === 'daily_wage') {
            return $this->processDailyWageChange($action, $clientUuid, $serverId, $payload, $userId);
        }

        if ($entity === 'weekly_payment') {
            return $this->processWeeklyPaymentChange($action, $clientUuid, $serverId, $payload, $userId);
        }

        return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'Entity tidak didukung');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function processDailyWageChange(
        string $action,
        ?string $clientUuid,
        ?int $serverId,
        array $payload,
        int $userId
    ): SyncPushResultDTO {
        $entity = 'daily_wage';

        if ($action === 'create') {
            $dailyWage = $this->dailyWageService->syncCreate($payload, $clientUuid, $userId);

            return new SyncPushResultDTO(
                status: SyncResultStatus::Success->value,
                entity: $entity,
                action: $action,
                clientUuid: $clientUuid,
                serverId: $dailyWage->id,
            );
        }

        if ($action === 'update') {
            if (! $serverId) {
                return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'server_id wajib diisi untuk update');
            }

            $dailyWage = $this->dailyWageService->syncUpdate($serverId, $payload, $userId);

            return new SyncPushResultDTO(
                status: SyncResultStatus::Success->value,
                entity: $entity,
                action: $action,
                clientUuid: $clientUuid,
                serverId: $dailyWage->id,
            );
        }

        return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'Action tidak didukung');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function processWeeklyPaymentChange(
        string $action,
        ?string $clientUuid,
        ?int $serverId,
        array $payload,
        int $userId
    ): SyncPushResultDTO {
        $entity = 'weekly_payment';

        if ($action === 'pay_employee') {
            $weekPeriodId = (int) ($payload['week_period_id'] ?? 0);
            $employeeId = (int) ($payload['employee_id'] ?? 0);
            if ($weekPeriodId <= 0 || $employeeId <= 0) {
                return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'week_period_id dan employee_id wajib diisi');
            }

            $payment = $this->weeklyPaymentService->payEmployee(
                weekPeriodId: $weekPeriodId,
                employeeId: $employeeId,
                notes: isset($payload['notes']) ? (string) $payload['notes'] : null,
                userId: $userId,
            );

            return new SyncPushResultDTO(
                status: SyncResultStatus::Success->value,
                entity: $entity,
                action: $action,
                clientUuid: $clientUuid,
                serverId: (int) $payment['payment_id'],
            );
        }

        if ($action === 'pay_all') {
            $weekPeriodId = (int) ($payload['week_period_id'] ?? 0);
            if ($weekPeriodId <= 0) {
                return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'week_period_id wajib diisi');
            }

            $payment = $this->weeklyPaymentService->payAll(
                weekPeriodId: $weekPeriodId,
                notes: isset($payload['notes']) ? (string) $payload['notes'] : null,
                userId: $userId,
            );

            return new SyncPushResultDTO(
                status: SyncResultStatus::Success->value,
                entity: $entity,
                action: $action,
                clientUuid: $clientUuid,
                serverId: (int) $payment['payment_id'],
            );
        }

        if ($action === 'undo') {
            $paymentId = $serverId ?? (int) ($payload['payment_id'] ?? 0);
            if ($paymentId <= 0) {
                return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'payment_id wajib diisi');
            }

            $payment = $this->weeklyPaymentService->undoPayment(
                paymentId: $paymentId,
                reason: isset($payload['reason']) ? (string) $payload['reason'] : null,
                userId: $userId,
            );

            return new SyncPushResultDTO(
                status: SyncResultStatus::Success->value,
                entity: $entity,
                action: $action,
                clientUuid: $clientUuid,
                serverId: (int) $payment['payment_id'],
            );
        }

        return $this->failedResult($entity, $action, $clientUuid, $serverId, ApiErrorCode::VALIDATION_ERROR, 'Action tidak didukung');
    }

    private function failedResult(
        string $entity,
        string $action,
        ?string $clientUuid,
        ?int $serverId,
        string $code,
        string $message
    ): SyncPushResultDTO {
        return new SyncPushResultDTO(
            status: SyncResultStatus::Failed->value,
            entity: $entity,
            action: $action,
            clientUuid: $clientUuid,
            serverId: $serverId,
            error: [
                'code' => $code,
                'message' => $message,
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function pull(string $updatedSince): array
    {
        $employees = $this->employeeRepository->getUpdatedSince($updatedSince)
            ->map(fn ($employee): array => [
                'id' => $employee->id,
                'name' => $employee->name,
                'phone_number' => $employee->phone_number,
                'notes' => $employee->notes,
                'is_active' => (bool) $employee->is_active,
                'updated_at' => $employee->updated_at?->toISOString(),
            ])
            ->values()
            ->all();

        $weekPeriods = $this->weekPeriodRepository->getUpdatedSince($updatedSince)
            ->map(fn ($week): array => [
                'id' => $week->id,
                'start_date' => (string) $week->start_date?->format('Y-m-d'),
                'end_date' => (string) $week->end_date?->format('Y-m-d'),
                'status' => $week->status->value,
                'locked_at' => $week->locked_at?->toISOString(),
                'updated_at' => $week->updated_at?->toISOString(),
            ])
            ->values()
            ->all();

        $dailyWages = $this->dailyWageRepository->getUpdatedSince($updatedSince)
            ->map(fn ($dailyWage): array => [
                'id' => $dailyWage->id,
                'employee_id' => $dailyWage->employee_id,
                'week_period_id' => $dailyWage->week_period_id,
                'wage_date' => (string) $dailyWage->wage_date?->format('Y-m-d'),
                'amount' => (int) $dailyWage->amount,
                'notes' => $dailyWage->notes,
                'is_paid' => (bool) $dailyWage->is_paid,
                'paid_at' => $dailyWage->paid_at?->toISOString(),
                'is_locked' => (bool) $dailyWage->is_paid || optional($dailyWage->weekPeriod)->locked_at !== null,
                'updated_at' => $dailyWage->updated_at?->toISOString(),
            ])
            ->values()
            ->all();

        $weeklyPayments = $this->weeklyPaymentRepository->getUpdatedSince($updatedSince)
            ->filter(fn ($payment): bool => ! (bool) $payment->is_voided)
            ->map(fn ($payment): array => [
                'id' => $payment->id,
                'week_period_id' => $payment->week_period_id,
                'employee_id' => $payment->employee_id,
                'payment_scope' => $payment->payment_scope->value,
                'total_amount' => (int) $payment->total_amount,
                'paid_at' => $payment->paid_at?->toISOString(),
                'updated_at' => $payment->updated_at?->toISOString(),
            ])
            ->values()
            ->all();

        return [
            'server_time' => CarbonImmutable::now('UTC')->toISOString(),
            'employees' => $employees,
            'week_periods' => $weekPeriods,
            'daily_wages' => $dailyWages,
            'weekly_payments' => $weeklyPayments,
        ];
    }
}
