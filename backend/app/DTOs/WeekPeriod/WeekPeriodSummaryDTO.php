<?php

namespace App\DTOs\WeekPeriod;

use App\Models\WeekPeriod;

class WeekPeriodSummaryDTO
{
    /**
     * @param  array{
     *     employee_count: int,
     *     filled_wage_count?: int,
     *     total_amount: int,
     *     paid_employee_count: int,
     *     unpaid_employee_count: int
     * }  $summary
     */
    public function __construct(
        public readonly WeekPeriod $weekPeriod,
        public readonly array $summary,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->weekPeriod->id,
            'start_date' => (string) $this->weekPeriod->start_date?->format('Y-m-d'),
            'end_date' => (string) $this->weekPeriod->end_date?->format('Y-m-d'),
            'status' => (string) $this->weekPeriod->status->value,
            'is_locked' => $this->weekPeriod->locked_at !== null,
            'locked_at' => $this->weekPeriod->locked_at?->toISOString(),
            'summary' => [
                'employee_count' => (int) ($this->summary['employee_count'] ?? 0),
                'filled_wage_count' => (int) ($this->summary['filled_wage_count'] ?? 0),
                'total_amount' => (int) ($this->summary['total_amount'] ?? 0),
                'paid_employee_count' => (int) ($this->summary['paid_employee_count'] ?? 0),
                'unpaid_employee_count' => (int) ($this->summary['unpaid_employee_count'] ?? 0),
            ],
        ];
    }
}

