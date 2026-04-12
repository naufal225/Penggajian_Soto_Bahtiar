<?php

namespace App\Http\Controllers\Api\Mobile\Employee;

use App\DTOs\Employee\EmployeeDataDTO;
use App\DTOs\Employee\EmployeeListQueryDTO;
use App\DTOs\Employee\EmployeeResponseDTO;
use App\Exceptions\EmployeeNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\Employee\ListEmployeeRequest;
use App\Http\Requests\Api\Mobile\Employee\StoreEmployeeRequest;
use App\Http\Requests\Api\Mobile\Employee\UpdateEmployeeRequest;
use App\Services\Employee\EmployeeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        private readonly EmployeeService $employeeService
    ) {
    }

    public function index(ListEmployeeRequest $request): JsonResponse
    {
        $paginator = $this->employeeService->getList(
            EmployeeListQueryDTO::fromArray($request->validated())
        );

        $data = collect($paginator->items())
            ->map(fn ($employee) => EmployeeResponseDTO::fromModel($employee)->toArray())
            ->values()
            ->all();

        return ApiResponse::success(
            message: 'Daftar karyawan berhasil diambil',
            data: $data,
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ]
        );
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $employee = $this->employeeService->create(
            payload: EmployeeDataDTO::fromArray($request->validated()),
            createdByUserId: (int) $request->user()->id,
        );

        return ApiResponse::success(
            message: 'Karyawan berhasil ditambahkan',
            data: EmployeeResponseDTO::fromModel($employee)->toArray(),
        );
    }

    public function show(int $employeeId): JsonResponse
    {
        try {
            $employee = $this->employeeService->getDetail($employeeId);
        } catch (EmployeeNotFoundException) {
            return $this->employeeNotFoundResponse();
        }

        return ApiResponse::success(
            message: 'Detail karyawan berhasil diambil',
            data: EmployeeResponseDTO::fromModel($employee)->toArray(),
        );
    }

    public function update(UpdateEmployeeRequest $request, int $employeeId): JsonResponse
    {
        try {
            $employee = $this->employeeService->update(
                employeeId: $employeeId,
                payload: EmployeeDataDTO::fromArray($request->validated()),
                updatedByUserId: (int) $request->user()->id,
            );
        } catch (EmployeeNotFoundException) {
            return $this->employeeNotFoundResponse();
        }

        return ApiResponse::success(
            message: 'Data karyawan berhasil diperbarui',
            data: EmployeeResponseDTO::fromModel($employee)->toArray(),
        );
    }

    public function deactivate(Request $request, int $employeeId): JsonResponse
    {
        try {
            $employee = $this->employeeService->deactivate(
                employeeId: $employeeId,
                updatedByUserId: (int) $request->user()->id,
            );
        } catch (EmployeeNotFoundException) {
            return $this->employeeNotFoundResponse();
        }

        return ApiResponse::success(
            message: 'Karyawan berhasil dinonaktifkan',
            data: [
                'id' => $employee->id,
                'is_active' => (bool) $employee->is_active,
            ],
        );
    }

    public function activate(Request $request, int $employeeId): JsonResponse
    {
        try {
            $employee = $this->employeeService->activate(
                employeeId: $employeeId,
                updatedByUserId: (int) $request->user()->id,
            );
        } catch (EmployeeNotFoundException) {
            return $this->employeeNotFoundResponse();
        }

        return ApiResponse::success(
            message: 'Karyawan berhasil diaktifkan',
            data: [
                'id' => $employee->id,
                'is_active' => (bool) $employee->is_active,
            ],
        );
    }

    private function employeeNotFoundResponse(): JsonResponse
    {
        return ApiResponse::error(
            message: 'Karyawan tidak ditemukan',
            code: 'EMPLOYEE_NOT_FOUND',
            status: 404,
        );
    }
}
