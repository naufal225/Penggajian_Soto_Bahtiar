<?php

namespace App\Http\Controllers\Api\Mobile\DailyWage;

use App\Exceptions\DailyWageDuplicateException;
use App\Exceptions\DailyWageLockedException;
use App\Exceptions\DailyWageNotFoundException;
use App\Exceptions\EmployeeInactiveException;
use App\Exceptions\EmployeeNotFoundException;
use App\Exceptions\ForbiddenActionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\DailyWage\DailyWageHistoryRequest;
use App\Http\Requests\Api\Mobile\DailyWage\GetDailyWagesByDateRequest;
use App\Http\Requests\Api\Mobile\DailyWage\StoreDailyWageRequest;
use App\Http\Requests\Api\Mobile\DailyWage\UpdateDailyWageRequest;
use App\Services\DailyWage\DailyWageService;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class DailyWageController extends Controller
{
    public function __construct(
        private readonly DailyWageService $dailyWageService
    ) {
    }

    public function index(GetDailyWagesByDateRequest $request): JsonResponse
    {
        $data = $this->dailyWageService->getByDate($request->validated('date'));

        return ApiResponse::success(
            message: 'Data gaji harian berhasil diambil',
            data: $data,
        );
    }

    public function store(StoreDailyWageRequest $request): JsonResponse
    {
        try {
            $dailyWage = $this->dailyWageService->create(
                payload: $request->validated(),
                createdByUserId: (int) $request->user()->id,
            );
        } catch (EmployeeNotFoundException) {
            return ApiResponse::error(
                message: 'Karyawan tidak ditemukan',
                code: ApiErrorCode::EMPLOYEE_NOT_FOUND,
                status: 404,
            );
        } catch (EmployeeInactiveException) {
            return ApiResponse::error(
                message: 'Karyawan nonaktif tidak dapat diinput',
                code: ApiErrorCode::EMPLOYEE_INACTIVE,
                status: 409,
            );
        } catch (DailyWageDuplicateException) {
            return ApiResponse::error(
                message: 'Gaji harian untuk karyawan dan tanggal tersebut sudah ada',
                code: ApiErrorCode::DAILY_WAGE_DUPLICATE,
                fields: [
                    'employee_id' => ['sudah memiliki gaji pada tanggal tersebut'],
                    'wage_date' => ['sudah digunakan'],
                ],
                status: 409,
            );
        } catch (DailyWageLockedException $exception) {
            return ApiResponse::error(
                message: 'Gaji harian tidak dapat diubah karena sudah dibayar',
                code: ApiErrorCode::DAILY_WAGE_LOCKED,
                details: $exception->details,
                status: 409,
            );
        } catch (ForbiddenActionException) {
            return ApiResponse::error(
                message: 'Data hanya boleh diubah pada minggu berjalan',
                code: ApiErrorCode::FORBIDDEN_ACTION,
                status: 403,
            );
        }

        return ApiResponse::success(
            message: 'Gaji harian berhasil disimpan',
            data: $this->dailyWageService->toResponse($dailyWage),
        );
    }

    public function update(UpdateDailyWageRequest $request, int $dailyWageId): JsonResponse
    {
        try {
            $dailyWage = $this->dailyWageService->update(
                dailyWageId: $dailyWageId,
                payload: $request->validated(),
                updatedByUserId: (int) $request->user()->id,
            );
        } catch (DailyWageNotFoundException) {
            return ApiResponse::error(
                message: 'Catatan gaji harian tidak ditemukan',
                code: ApiErrorCode::DAILY_WAGE_NOT_FOUND,
                status: 404,
            );
        } catch (DailyWageLockedException $exception) {
            return ApiResponse::error(
                message: 'Gaji harian tidak dapat diubah karena sudah dibayar',
                code: ApiErrorCode::DAILY_WAGE_LOCKED,
                details: $exception->details,
                status: 409,
            );
        } catch (ForbiddenActionException) {
            return ApiResponse::error(
                message: 'Data hanya boleh diubah pada minggu berjalan',
                code: ApiErrorCode::FORBIDDEN_ACTION,
                status: 403,
            );
        }

        return ApiResponse::success(
            message: 'Gaji harian berhasil diperbarui',
            data: $this->dailyWageService->toResponse($dailyWage),
        );
    }

    public function show(int $dailyWageId): JsonResponse
    {
        try {
            $dailyWage = $this->dailyWageService->getDetail($dailyWageId);
        } catch (DailyWageNotFoundException) {
            return ApiResponse::error(
                message: 'Catatan gaji harian tidak ditemukan',
                code: ApiErrorCode::DAILY_WAGE_NOT_FOUND,
                status: 404,
            );
        }

        return ApiResponse::success(
            message: 'Detail gaji harian berhasil diambil',
            data: $this->dailyWageService->toResponse($dailyWage),
        );
    }

    public function history(DailyWageHistoryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 20);
        $paginator = $this->dailyWageService->getHistory(
            filters: $validated,
            page: $page,
            perPage: $perPage,
        );

        return ApiResponse::success(
            message: 'Riwayat gaji harian berhasil diambil',
            data: $paginator->items(),
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ]
        );
    }
}

