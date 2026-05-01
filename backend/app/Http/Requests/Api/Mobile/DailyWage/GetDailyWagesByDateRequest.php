<?php

namespace App\Http\Requests\Api\Mobile\DailyWage;

use Illuminate\Foundation\Http\FormRequest;

class GetDailyWagesByDateRequest extends FormRequest
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
            'date' => ['required', 'date_format:Y-m-d'],
        ];
    }
}

