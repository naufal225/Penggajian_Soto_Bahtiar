<?php

namespace App\DTOs\Employee;

class EmployeeDataDTO
{
    public function __construct(
        public readonly string $name,
        public readonly ?string $phoneNumber,
        public readonly ?string $notes,
    ) {
    }

    /**
     * @param  array{name: string, phone_number?: string|null, notes?: string|null}  $payload
     */
    public static function fromArray(array $payload): self
    {
        return new self(
            name: $payload['name'],
            phoneNumber: $payload['phone_number'] ?? null,
            notes: $payload['notes'] ?? null,
        );
    }

    /**
     * @return array{name: string, phone_number: string|null, notes: string|null}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'phone_number' => $this->phoneNumber,
            'notes' => $this->notes,
        ];
    }
}
