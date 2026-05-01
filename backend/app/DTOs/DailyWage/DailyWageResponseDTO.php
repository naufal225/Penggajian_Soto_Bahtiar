<?php

namespace App\DTOs\DailyWage;

use App\Models\DailyWage;

class DailyWageResponseDTO
{
    public function __construct(
        private readonly DailyWage $dailyWage
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->dailyWage->id,
            'employee_id' => $this->dailyWage->employee_id,
            'employee_name' => (string) optional($this->dailyWage->employee)->name,
            'week_period_id' => $this->dailyWage->week_period_id,
            'wage_date' => (string) $this->dailyWage->wage_date?->format('Y-m-d'),
            'amount' => (int) $this->dailyWage->amount,
            'notes' => $this->dailyWage->notes,
            'is_paid' => (bool) $this->dailyWage->is_paid,
            'is_locked' => (bool) $this->dailyWage->is_paid || optional($this->dailyWage->weekPeriod)->locked_at !== null,
            'paid_at' => $this->dailyWage->paid_at?->toISOString(),
            'client_uuid' => $this->dailyWage->client_uuid,
            'created_at' => $this->dailyWage->created_at?->toISOString(),
            'updated_at' => $this->dailyWage->updated_at?->toISOString(),
        ];
    }
}

