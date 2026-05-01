<?php

namespace App\Http\Requests\Api\Mobile\DailyWage;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyWageRequest extends FormRequest
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
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'wage_date' => ['required', 'date_format:Y-m-d'],
            'amount' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'client_uuid' => ['nullable', 'uuid', 'max:255'],
        ];
    }
}

