<?php

namespace App\Http\Controllers\Api\Mobile\WeeklyPayment;

use App\Exceptions\EmployeeNotFoundException;
use App\Exceptions\ForbiddenActionException;
use App\Exceptions\PaymentAlreadyCompletedException;
use App\Exceptions\PaymentNotFoundException;
use App\Exceptions\WeekAlreadyFullyPaidException;
use App\Exceptions\WeekPeriodNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\WeeklyPayment\ListWeeklyPaymentRequest;
use App\Http\Requests\Api\Mobile\WeeklyPayment\PayAllRequest;
use App\Http\Requests\Api\Mobile\WeeklyPayment\PayEmployeeRequest;
use App\Http\Requests\Api\Mobile\WeeklyPayment\UndoWeeklyPaymentRequest;
use App\Services\WeeklyPayment\WeeklyPaymentService;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class WeeklyPaymentController extends Controller
{
    public function __construct(
        private readonly WeeklyPaymentService $weeklyPaymentService
    ) {
    }

    public function payEmployee(PayEmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $data = $this->weeklyPaymentService->payEmployee(
                weekPeriodId: (int) $validated['week_period_id'],
                employeeId: (int) $validated['employee_id'],
                notes: $validated['notes'] ?? null,
                userId: (int) $request->user()->id,
            );
        } catch (WeekPeriodNotFoundException) {
            return ApiResponse::error(
                message: 'Minggu tidak ditemukan',
                code: ApiErrorCode::WEEK_PERIOD_NOT_FOUND,
                status: 404,
            );
        } catch (EmployeeNotFoundException) {
            return ApiResponse::error(
                message: 'Karyawan tidak ditemukan',
                code: ApiErrorCode::EMPLOYEE_NOT_FOUND,
                status: 404,
            );
        } catch (WeekAlreadyFullyPaidException) {
            return ApiResponse::error(
                message: 'Semua gaji yang sudah dicatat minggu ini sudah dibayar',
                code: ApiErrorCode::WEEK_ALREADY_FULLY_PAID,
                status: 409,
            );
        } catch (PaymentAlreadyCompletedException) {
            return ApiResponse::error(
                message: 'Tidak ada sisa gaji minggu ini untuk dibayar',
                code: ApiErrorCode::PAYMENT_ALREADY_COMPLETED,
                details: [
                    'week_period_id' => (int) $validated['week_period_id'],
                    'employee_id' => (int) $validated['employee_id'],
                ],
                status: 409,
            );
        }

        return ApiResponse::success(
            message: 'Pembayaran karyawan berhasil diproses',
            data: $data,
        );
    }

    public function payAll(PayAllRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $data = $this->weeklyPaymentService->payAll(
                weekPeriodId: (int) $validated['week_period_id'],
                notes: $validated['notes'] ?? null,
                userId: (int) $request->user()->id,
            );
        } catch (WeekPeriodNotFoundException) {
            return ApiResponse::error(
                message: 'Minggu tidak ditemukan',
                code: ApiErrorCode::WEEK_PERIOD_NOT_FOUND,
                status: 404,
            );
        } catch (WeekAlreadyFullyPaidException) {
            return ApiResponse::error(
                message: 'Semua gaji yang sudah dicatat minggu ini sudah dibayar',
                code: ApiErrorCode::WEEK_ALREADY_FULLY_PAID,
                status: 409,
            );
        } catch (PaymentAlreadyCompletedException) {
            return ApiResponse::error(
                message: 'Tidak ada sisa gaji minggu ini untuk dibayar',
                code: ApiErrorCode::PAYMENT_ALREADY_COMPLETED,
                status: 409,
            );
        }

        return ApiResponse::success(
            message: 'Pembayaran semua karyawan berhasil diproses',
            data: $data,
        );
    }

    public function index(ListWeeklyPaymentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 20);
        $weekPeriodId = isset($validated['week_period_id']) ? (int) $validated['week_period_id'] : null;
        $paginator = $this->weeklyPaymentService->listPayments($weekPeriodId, $page, $perPage);

        return ApiResponse::success(
            message: 'Riwayat pembayaran berhasil diambil',
            data: $paginator->items(),
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ]
        );
    }

    public function show(int $paymentId): JsonResponse
    {
        try {
            $data = $this->weeklyPaymentService->getPaymentDetail($paymentId);
        } catch (PaymentNotFoundException) {
            return ApiResponse::error(
                message: 'Detail pembayaran tidak ditemukan',
                code: ApiErrorCode::PAYMENT_NOT_FOUND,
                status: 404,
            );
        }

        return ApiResponse::success(
            message: 'Detail pembayaran berhasil diambil',
            data: $data,
        );
    }

    public function undo(UndoWeeklyPaymentRequest $request, int $paymentId): JsonResponse
    {
        try {
            $data = $this->weeklyPaymentService->undoPayment(
                paymentId: $paymentId,
                reason: $request->validated('reason'),
                userId: (int) $request->user()->id,
            );
        } catch (PaymentNotFoundException) {
            return ApiResponse::error(
                message: 'Pembayaran tidak ditemukan',
                code: ApiErrorCode::PAYMENT_NOT_FOUND,
                status: 404,
            );
        } catch (ForbiddenActionException) {
            return ApiResponse::error(
                message: 'Undo pembayaran hanya untuk minggu berjalan',
                code: ApiErrorCode::FORBIDDEN_ACTION,
                status: 403,
            );
        }

        return ApiResponse::success(
            message: 'Undo pembayaran berhasil',
            data: $data,
        );
    }
}
