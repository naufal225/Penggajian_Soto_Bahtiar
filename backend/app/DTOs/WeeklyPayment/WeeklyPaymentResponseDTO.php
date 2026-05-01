<?php

namespace App\DTOs\WeeklyPayment;

use App\Models\WeeklyPayment;

class WeeklyPaymentResponseDTO
{
    public function __construct(
        private readonly WeeklyPayment $payment
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->payment->id,
            'week_period_id' => $this->payment->week_period_id,
            'employee_id' => $this->payment->employee_id,
            'employee_name' => optional($this->payment->employee)->name,
            'payment_scope' => $this->payment->payment_scope->value,
            'total_amount' => (int) $this->payment->total_amount,
            'paid_at' => $this->payment->paid_at?->toISOString(),
            'notes' => $this->payment->notes,
        ];
    }
}

