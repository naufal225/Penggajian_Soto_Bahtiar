<?php

namespace App\Http\Controllers\Api\Mobile\Auth;

use App\DTOs\Auth\LoginRequestDTO;
use App\Exceptions\InvalidCredentialsException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\Auth\LoginRequest;
use App\Services\Auth\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $responseDTO = $this->authService->login(
                LoginRequestDTO::fromArray($request->validated())
            );
        } catch (InvalidCredentialsException) {
            return ApiResponse::error(
                message: 'Email atau password salah',
                code: 'UNAUTHORIZED',
                status: 401,
            );
        }

        return ApiResponse::success(
            message: 'Login berhasil',
            data: $responseDTO->toArray(),
        );
    }
}
