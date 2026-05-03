<?php

namespace Database\Seeders;

use App\Enums\WeekStatus;
use App\Models\WeekPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class WeekPeriodSeeder extends Seeder
{
    /**
     * Seed historical week periods from 2026-05-02 until today.
     *
     * The app uses flexible weeks, but for seed data we create contiguous
     * 7-day blocks so history screens already have period records to read.
     * Only one current open week is allowed; if an open week already exists,
     * the seeder keeps all generated periods locked.
     */
    public function run(): void
    {
        $seedStart = CarbonImmutable::create(2026, 5, 2)->startOfDay();
        $today = CarbonImmutable::now()->startOfDay();

        if ($seedStart->gt($today)) {
            return;
        }

        $hasExistingOpenWeek = WeekPeriod::query()
            ->whereNull('locked_at')
            ->where('status', '!=', WeekStatus::FullyPaid->value)
            ->exists();

        $cursor = $seedStart;

        while ($cursor->lte($today)) {
            $blockEnd = $cursor->addDays(6);
            if ($blockEnd->gt($today)) {
                $blockEnd = $today;
            }

            $isLatestBlock = $blockEnd->isSameDay($today);
            $shouldCreateOpenWeek = $isLatestBlock && ! $hasExistingOpenWeek;

            $attributes = [
                'start_date' => $cursor->format('Y-m-d'),
                'end_date' => $blockEnd->format('Y-m-d'),
            ];

            $values = [
                'status' => $shouldCreateOpenWeek ? WeekStatus::Open->value : WeekStatus::FullyPaid->value,
                'locked_at' => $shouldCreateOpenWeek ? null : $blockEnd->endOfDay(),
            ];

            WeekPeriod::query()->firstOrCreate($attributes, $values);

            $cursor = $blockEnd->addDay();
        }
    }
}
