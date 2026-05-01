<?php

namespace App\Repositories\Eloquent;

use App\DTOs\Employee\EmployeeDataDTO;
use App\DTOs\Employee\EmployeeListQueryDTO;
use App\Models\Employee;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class EmployeeRepository implements EmployeeRepositoryInterface
{
    public function paginate(EmployeeListQueryDTO $query): LengthAwarePaginator
    {
        $builder = Employee::query();

        if ($query->status === 'active') {
            $builder->where('is_active', true);
        } elseif ($query->status === 'inactive') {
            $builder->where('is_active', false);
        }

        if ($query->search !== null && $query->search !== '') {
            $search = trim($query->search);
            $builder->where(function ($subQuery) use ($search): void {
                $subQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        return $builder
            ->orderByDesc('created_at')
            ->paginate(
                perPage: $query->perPage,
                columns: ['*'],
                pageName: 'page',
                page: $query->page,
            );
    }

    public function create(EmployeeDataDTO $payload, int $createdByUserId): Employee
    {
        return Employee::query()->create([
            ...$payload->toArray(),
            'is_active' => true,
            'created_by_user_id' => $createdByUserId,
            'updated_by_user_id' => $createdByUserId,
        ]);
    }

    public function findById(int $employeeId): ?Employee
    {
        return Employee::query()
            ->whereKey($employeeId)
            ->first();
    }

    public function countActive(): int
    {
        return Employee::query()
            ->where('is_active', true)
            ->count();
    }

    public function getActiveEmployees(): Collection
    {
        return Employee::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function getEmployeesByIds(array $employeeIds): Collection
    {
        if ($employeeIds === []) {
            return collect();
        }

        return Employee::query()
            ->whereIn('id', $employeeIds)
            ->orderBy('name')
            ->get();
    }

    public function getUpdatedSince(string $updatedSince): Collection
    {
        return Employee::query()
            ->where('updated_at', '>=', $updatedSince)
            ->orderBy('updated_at')
            ->get();
    }

    public function update(Employee $employee, EmployeeDataDTO $payload, int $updatedByUserId): Employee
    {
        $employee->fill([
            ...$payload->toArray(),
            'updated_by_user_id' => $updatedByUserId,
        ]);
        $employee->save();

        return $employee->refresh();
    }

    public function setActiveStatus(Employee $employee, bool $isActive, int $updatedByUserId): Employee
    {
        $employee->fill([
            'is_active' => $isActive,
            'updated_by_user_id' => $updatedByUserId,
        ]);
        $employee->save();

        return $employee->refresh();
    }

    public function softDelete(Employee $employee, int $updatedByUserId): Employee
    {
        $employee->fill([
            'updated_by_user_id' => $updatedByUserId,
        ]);
        $employee->save();
        $employee->delete();

        return $employee;
    }
}
