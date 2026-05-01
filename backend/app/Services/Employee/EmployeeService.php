<?php

namespace App\Services\Employee;

use App\DTOs\Employee\EmployeeDataDTO;
use App\DTOs\Employee\EmployeeListQueryDTO;
use App\Exceptions\EmployeeNotFoundException;
use App\Exceptions\ForbiddenActionException;
use App\Models\Employee;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EmployeeService
{
    public function __construct(
        private readonly EmployeeRepositoryInterface $employeeRepository
    ) {
    }

    public function getList(EmployeeListQueryDTO $query): LengthAwarePaginator
    {
        return $this->employeeRepository->paginate($query);
    }

    public function create(EmployeeDataDTO $payload, int $createdByUserId): Employee
    {
        return $this->employeeRepository->create($payload, $createdByUserId);
    }

    /**
     * @throws EmployeeNotFoundException
     */
    public function getDetail(int $employeeId): Employee
    {
        return $this->findOrFail($employeeId);
    }

    /**
     * @throws EmployeeNotFoundException
     */
    public function update(int $employeeId, EmployeeDataDTO $payload, int $updatedByUserId): Employee
    {
        $employee = $this->findOrFail($employeeId);

        return $this->employeeRepository->update($employee, $payload, $updatedByUserId);
    }

    /**
     * @throws EmployeeNotFoundException
     */
    public function deactivate(int $employeeId, int $updatedByUserId): Employee
    {
        $employee = $this->findOrFail($employeeId);

        return $this->employeeRepository->setActiveStatus($employee, false, $updatedByUserId);
    }

    /**
     * @throws EmployeeNotFoundException
     */
    public function activate(int $employeeId, int $updatedByUserId): Employee
    {
        $employee = $this->findOrFail($employeeId);

        return $this->employeeRepository->setActiveStatus($employee, true, $updatedByUserId);
    }

    /**
     * @throws EmployeeNotFoundException
     * @throws ForbiddenActionException
     */
    public function delete(int $employeeId, int $updatedByUserId): Employee
    {
        $employee = $this->findOrFail($employeeId);

        if ((bool) $employee->is_active) {
            throw new ForbiddenActionException('Karyawan masih aktif');
        }

        return $this->employeeRepository->softDelete($employee, $updatedByUserId);
    }

    /**
     * @throws EmployeeNotFoundException
     */
    private function findOrFail(int $employeeId): Employee
    {
        $employee = $this->employeeRepository->findById($employeeId);

        if (! $employee) {
            throw new EmployeeNotFoundException();
        }

        return $employee;
    }
}
