<?php

namespace App\Http\Requests\Api\Mobile\WeeklyPayment;

use Illuminate\Foundation\Http\FormRequest;

class PayEmployeeRequest extends FormRequest
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
            'week_period_id' => ['required', 'integer', 'exists:week_periods,id'],
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

