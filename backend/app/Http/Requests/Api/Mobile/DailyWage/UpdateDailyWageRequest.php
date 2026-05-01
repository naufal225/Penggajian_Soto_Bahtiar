<?php

namespace App\Http\Requests\Api\Mobile\DailyWage;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDailyWageRequest extends FormRequest
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
            'amount' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

