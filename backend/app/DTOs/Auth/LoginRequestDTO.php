<?php

namespace App\DTOs\Auth;

class LoginRequestDTO
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
        public readonly string $deviceName,
    ) {
    }

    /**
     * @param  array{email: string, password: string, device_name: string}  $payload
     */
    public static function fromArray(array $payload): self
    {
        return new self(
            email: $payload['email'],
            password: $payload['password'],
            deviceName: $payload['device_name'],
        );
    }
}
