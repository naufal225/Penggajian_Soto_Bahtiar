<?php

namespace App\Repositories\Contracts;

use App\DTOs\Employee\EmployeeDataDTO;
use App\DTOs\Employee\EmployeeListQueryDTO;
use App\Models\Employee;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface EmployeeRepositoryInterface
{
    public function paginate(EmployeeListQueryDTO $query): LengthAwarePaginator;

    public function create(EmployeeDataDTO $payload, int $createdByUserId): Employee;

    public function findById(int $employeeId): ?Employee;

    public function update(Employee $employee, EmployeeDataDTO $payload, int $updatedByUserId): Employee;

    public function setActiveStatus(Employee $employee, bool $isActive, int $updatedByUserId): Employee;
}
