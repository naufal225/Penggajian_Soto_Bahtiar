<?php

namespace App\Repositories\Eloquent;

use App\Models\Employee;
use App\Repositories\Contracts\DashboardRepositoryInterface;

class DashboardRepository implements DashboardRepositoryInterface
{
    public function countActiveEmployees(): int
    {
        return Employee::query()
            ->where('is_active', true)
            ->count();
    }
}
