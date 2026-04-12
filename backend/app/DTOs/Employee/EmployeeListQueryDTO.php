<?php

namespace App\DTOs\Employee;

class EmployeeListQueryDTO
{
    public function __construct(
        public readonly string $status,
        public readonly int $page,
        public readonly int $perPage,
        public readonly ?string $search,
    ) {
    }

    /**
     * @param  array{status?: string, page?: int, per_page?: int, search?: string|null}  $query
     */
    public static function fromArray(array $query): self
    {
        return new self(
            status: $query['status'] ?? 'active',
            page: $query['page'] ?? 1,
            perPage: $query['per_page'] ?? 20,
            search: $query['search'] ?? null,
        );
    }
}
