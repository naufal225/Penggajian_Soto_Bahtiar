<?php

namespace App\Services\Auth;

use App\DTOs\Auth\LoginRequestDTO;
use App\DTOs\Auth\LoginResponseDTO;
use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository
    ) {
    }

    /**
     * @throws InvalidCredentialsException
     */
    public function login(LoginRequestDTO $requestDTO): LoginResponseDTO
    {
        $user = $this->userRepository->findByEmail($requestDTO->email);

        if (! $user || ! Hash::check($requestDTO->password, $user->password)) {
            throw new InvalidCredentialsException();
        }

        $token = $user->createToken($requestDTO->deviceName)->plainTextToken;

        return LoginResponseDTO::fromUser($token, $user);
    }

    public function logout(User $user): void
    {
        $currentToken = $user->currentAccessToken();
        if ($currentToken) {
            $currentToken->delete();
        }
    }

    /**
     * @return array{id:int,name:string,email:string}
     */
    public function currentUserProfile(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }
}
