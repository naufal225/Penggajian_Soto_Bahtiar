<?php

namespace App\Repositories\Contracts;

use App\Models\WeekPeriod;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface WeekPeriodRepositoryInterface
{
    public function findById(int $weekPeriodId): ?WeekPeriod;

    public function findCurrentOpenWeek(): ?WeekPeriod;

    public function findByDate(string $date): ?WeekPeriod;

    public function create(string $startDate, string $endDate): WeekPeriod;

    public function save(WeekPeriod $weekPeriod): WeekPeriod;

    public function paginate(?string $status, int $page, int $perPage): LengthAwarePaginator;

    public function getUpdatedSince(string $updatedSince): Collection;
}

