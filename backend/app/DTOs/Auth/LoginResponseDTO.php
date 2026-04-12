<?php

namespace App\DTOs\Auth;

use App\Models\User;

class LoginResponseDTO
{
    /**
     * @param  array{id: int, name: string, email: string}  $user
     */
    public function __construct(
        public readonly string $token,
        public readonly array $user,
    ) {
    }

    public static function fromUser(string $token, User $user): self
    {
        return new self(
            token: $token,
            user: [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        );
    }

    /**
     * @return array{token: string, user: array{id: int, name: string, email: string}}
     */
    public function toArray(): array
    {
        return [
            'token' => $this->token,
            'user' => $this->user,
        ];
    }
}
