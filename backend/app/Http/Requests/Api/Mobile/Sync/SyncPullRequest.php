<?php

namespace App\Http\Requests\Api\Mobile\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SyncPullRequest extends FormRequest
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
            'updated_since' => ['required', 'date'],
        ];
    }
}

