<?php

namespace App\Http\Requests\Api\Mobile\Report;

use Illuminate\Foundation\Http\FormRequest;

class WeeklySummaryPdfRequest extends FormRequest
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
        ];
    }
}

