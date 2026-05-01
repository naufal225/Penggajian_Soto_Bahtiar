<?php

namespace App\Http\Requests\Api\Mobile\WeeklyPayment;

use Illuminate\Foundation\Http\FormRequest;

class UndoWeeklyPaymentRequest extends FormRequest
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
            'reason' => ['nullable', 'string'],
        ];
    }
}

