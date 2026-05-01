<?php

namespace App\Services\WeeklyPayment;

use App\DTOs\WeeklyPayment\WeeklyPaymentResponseDTO;
use App\Enums\PaymentScope;
use App\Exceptions\EmployeeNotFoundException;
use App\Exceptions\PaymentAlreadyCompletedException;
use App\Exceptions\PaymentNotFoundException;
use App\Exceptions\WeekAlreadyFullyPaidException;
use App\Exceptions\WeekPeriodNotFoundException;
use App\Models\WeeklyPayment;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Repositories\Contracts\WeeklyPaymentRepositoryInterface;
use App\Services\WeekPeriod\WeekPeriodService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Facades\DB;

class WeeklyPaymentService
{
    public function __construct(
        private readonly WeeklyPaymentRepositoryInterface $weeklyPaymentRepository,
        private readonly DailyWageRepositoryInterface $dailyWageRepository,
        private readonly EmployeeRepositoryInterface $employeeRepository,
        private readonly WeekPeriodService $weekPeriodService,
    ) {
    }

    /**
     * @return array<string, mixed>
     *
     * @throws EmployeeNotFoundException
     * @throws PaymentAlreadyCompletedException
     * @throws WeekAlreadyFullyPaidException
     * @throws WeekPeriodNotFoundException
     */
    public function payEmployee(int $weekPeriodId, int $employeeId, ?string $notes, int $userId): array
    {
        $this->weekPeriodService->getByIdOrFail($weekPeriodId);

        $employee = $this->employeeRepository->findById($employeeId);
        if (! $employee) {
            throw new EmployeeNotFoundException();
        }

        $now = CarbonImmutable::now();

        $result = DB::transaction(function () use ($weekPeriodId, $employeeId, $notes, $userId, $now): array {
            $unpaidRows = $this->dailyWageRepository->findUnpaidByWeekAndEmployee($weekPeriodId, $employeeId);
            if ($unpaidRows->isEmpty()) {
                throw new PaymentAlreadyCompletedException();
            }

            $totalAmount = (int) $unpaidRows->sum('amount');

            $payment = $this->weeklyPaymentRepository->create([
                'week_period_id' => $weekPeriodId,
                'employee_id' => $employeeId,
                'payment_scope' => PaymentScope::Employee->value,
                'total_amount' => $totalAmount,
                'paid_at' => $now->toDateTimeString(),
                'created_by_user_id' => $userId,
                'notes' => $notes,
            ]);

            $dailyWageIds = $unpaidRows->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $this->dailyWageRepository->markAsPaid(
                dailyWageIds: $dailyWageIds,
                paymentId: $payment->id,
                paidAt: $now->toDateTimeString(),
            );

            $week = $this->weekPeriodService->getByIdOrFail($weekPeriodId);
            $updatedWeek = $this->weekPeriodService->refreshWeekStatus($week);

            return [$payment, $updatedWeek];
        });

        /** @var WeeklyPayment $payment */
        [$payment, $updatedWeek] = $result;

        return [
            'payment_id' => $payment->id,
            'week_period_id' => $payment->week_period_id,
            'employee_id' => $payment->employee_id,
            'employee_name' => optional($payment->employee)->name,
            'payment_scope' => $payment->payment_scope->value,
            'total_amount' => (int) $payment->total_amount,
            'paid_at' => $payment->paid_at?->toISOString(),
            'week_status_after_payment' => $updatedWeek->status->value,
        ];
    }

    /**
     * @return array<string, mixed>
     *
     * @throws PaymentAlreadyCompletedException
     * @throws WeekAlreadyFullyPaidException
     * @throws WeekPeriodNotFoundException
     */
    public function payAll(int $weekPeriodId, ?string $notes, int $userId): array
    {
        $this->weekPeriodService->getByIdOrFail($weekPeriodId);

        $now = CarbonImmutable::now();

        $result = DB::transaction(function () use ($weekPeriodId, $notes, $userId, $now): array {
            $unpaidRows = $this->dailyWageRepository->findUnpaidByWeek($weekPeriodId);
            if ($unpaidRows->isEmpty()) {
                throw new WeekAlreadyFullyPaidException();
            }

            $totalAmount = (int) $unpaidRows->sum('amount');
            $paidEmployeeCount = (int) $unpaidRows->pluck('employee_id')->unique()->count();

            $payment = $this->weeklyPaymentRepository->create([
                'week_period_id' => $weekPeriodId,
                'employee_id' => null,
                'payment_scope' => PaymentScope::All->value,
                'total_amount' => $totalAmount,
                'paid_at' => $now->toDateTimeString(),
                'created_by_user_id' => $userId,
                'notes' => $notes,
            ]);

            $dailyWageIds = $unpaidRows->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $this->dailyWageRepository->markAsPaid(
                dailyWageIds: $dailyWageIds,
                paymentId: $payment->id,
                paidAt: $now->toDateTimeString(),
            );

            $week = $this->weekPeriodService->getByIdOrFail($weekPeriodId);
            $updatedWeek = $this->weekPeriodService->refreshWeekStatus($week);

            return [$payment, $updatedWeek, $paidEmployeeCount];
        });

        /** @var WeeklyPayment $payment */
        [$payment, $updatedWeek, $paidEmployeeCount] = $result;

        return [
            'payment_id' => $payment->id,
            'week_period_id' => $payment->week_period_id,
            'payment_scope' => $payment->payment_scope->value,
            'total_amount' => (int) $payment->total_amount,
            'paid_employee_count' => (int) $paidEmployeeCount,
            'paid_at' => $payment->paid_at?->toISOString(),
            'week_status_after_payment' => $updatedWeek->status->value,
        ];
    }

    public function listPayments(?int $weekPeriodId, int $page, int $perPage): LengthAwarePaginator
    {
        $paginator = $this->weeklyPaymentRepository->paginate($weekPeriodId, $page, $perPage);
        $items = collect($paginator->items())
            ->map(fn (WeeklyPayment $payment): array => (new WeeklyPaymentResponseDTO($payment))->toArray())
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
     * @return array<string, mixed>
     *
     * @throws PaymentNotFoundException
     */
    public function getPaymentDetail(int $paymentId): array
    {
        $payment = $this->weeklyPaymentRepository->findById($paymentId);
        if (! $payment || $payment->is_voided) {
            throw new PaymentNotFoundException();
        }

        return [
            'id' => $payment->id,
            'week_period_id' => $payment->week_period_id,
            'week_range' => [
                'start_date' => (string) optional($payment->weekPeriod?->start_date)->format('Y-m-d'),
                'end_date' => (string) optional($payment->weekPeriod?->end_date)->format('Y-m-d'),
            ],
            'employee_id' => $payment->employee_id,
            'employee_name' => optional($payment->employee)->name,
            'payment_scope' => $payment->payment_scope->value,
            'total_amount' => (int) $payment->total_amount,
            'paid_at' => $payment->paid_at?->toISOString(),
            'notes' => $payment->notes,
            'daily_wages' => $payment->dailyWages
                ->map(fn ($dailyWage): array => [
                    'id' => $dailyWage->id,
                    'wage_date' => (string) $dailyWage->wage_date?->format('Y-m-d'),
                    'amount' => (int) $dailyWage->amount,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     *
     * @throws PaymentNotFoundException
     */
    public function undoPayment(int $paymentId, ?string $reason, int $userId): array
    {
        $payment = $this->weeklyPaymentRepository->findById($paymentId);
        if (! $payment) {
            throw new PaymentNotFoundException();
        }

        if ($payment->is_voided) {
            throw new PaymentNotFoundException();
        }

        [$updatedPayment, $weekAfterUndo] = DB::transaction(function () use ($payment, $reason, $userId): array {
            $payment->is_voided = true;
            $payment->voided_at = now();
            $payment->voided_by_user_id = $userId;
            $payment->void_reason = $reason;
            $payment = $this->weeklyPaymentRepository->save($payment);

            $this->dailyWageRepository->markAsUnpaidByPaymentId($payment->id);
            $week = $this->weekPeriodService->getByIdOrFail($payment->week_period_id);
            $weekAfterUndo = $this->weekPeriodService->refreshWeekStatus($week);

            return [$payment, $weekAfterUndo];
        });

        return [
            'payment_id' => $updatedPayment->id,
            'week_period_id' => $updatedPayment->week_period_id,
            'status' => 'undone',
            'week_status_after_undo' => $weekAfterUndo->status->value,
        ];
    }
}
