<?php

namespace App\Http\Requests\Api\Mobile\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SyncPushRequest extends FormRequest
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
            'device_id' => ['required', 'string', 'max:255'],
            'changes' => ['required', 'array', 'min:1'],
            'changes.*.entity' => ['required', 'string', 'in:daily_wage,weekly_payment'],
            'changes.*.action' => ['required', 'string', 'in:create,update,pay_employee,pay_all,undo'],
            'changes.*.client_uuid' => ['nullable', 'uuid'],
            'changes.*.server_id' => ['nullable', 'integer'],
            'changes.*.payload' => ['required', 'array'],
        ];
    }
}
