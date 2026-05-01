<?php

namespace App\Http\Requests\Api\Mobile\WeeklyPayment;

use Illuminate\Foundation\Http\FormRequest;

class ListWeeklyPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'week_period_id' => ['nullable', 'integer', 'exists:week_periods,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}

