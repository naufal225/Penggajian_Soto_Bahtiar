<?php

namespace App\DTOs\Employee;

use App\Models\Employee;

class EmployeeResponseDTO
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?string $phoneNumber,
        public readonly ?string $notes,
        public readonly bool $isActive,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromModel(Employee $employee): self
    {
        return new self(
            id: $employee->id,
            name: $employee->name,
            phoneNumber: $employee->phone_number,
            notes: $employee->notes,
            isActive: (bool) $employee->is_active,
            createdAt: (string) $employee->created_at?->toISOString(),
            updatedAt: (string) $employee->updated_at?->toISOString(),
        );
    }

    /**
     * @return array{
     *     id: int,
     *     name: string,
     *     phone_number: string|null,
     *     notes: string|null,
     *     is_active: bool,
     *     created_at: string,
     *     updated_at: string
     * }
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone_number' => $this->phoneNumber,
            'notes' => $this->notes,
            'is_active' => $this->isActive,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}
