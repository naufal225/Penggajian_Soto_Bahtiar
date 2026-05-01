<?php

namespace App\Repositories\Eloquent;

use App\Enums\WeekStatus;
use App\Models\WeekPeriod;
use App\Repositories\Contracts\WeekPeriodRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class WeekPeriodRepository implements WeekPeriodRepositoryInterface
{
    public function findById(int $weekPeriodId): ?WeekPeriod
    {
        return WeekPeriod::query()->whereKey($weekPeriodId)->first();
    }

    public function findCurrentOpenWeek(): ?WeekPeriod
    {
        return WeekPeriod::query()
            ->whereNull('locked_at')
            ->orderByDesc('id')
            ->first();
    }

    public function findByDate(string $date): ?WeekPeriod
    {
        return WeekPeriod::query()
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->first();
    }

    public function create(string $startDate, string $endDate): WeekPeriod
    {
        return WeekPeriod::query()->create([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => WeekStatus::Open->value,
            'locked_at' => null,
        ]);
    }

    public function save(WeekPeriod $weekPeriod): WeekPeriod
    {
        $weekPeriod->save();

        return $weekPeriod->refresh();
    }

    public function paginate(?string $status, int $page, int $perPage): LengthAwarePaginator
    {
        $builder = WeekPeriod::query();

        if ($status !== null && $status !== '') {
            $builder->where('status', $status);
        }

        return $builder
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->paginate(
                perPage: $perPage,
                columns: ['*'],
                pageName: 'page',
                page: $page
            );
    }

    public function getUpdatedSince(string $updatedSince): Collection
    {
        return WeekPeriod::query()
            ->where('updated_at', '>=', $updatedSince)
            ->orderBy('updated_at')
            ->get();
    }
}
