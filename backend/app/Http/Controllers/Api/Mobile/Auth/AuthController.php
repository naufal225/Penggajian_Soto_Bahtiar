<?php

namespace App\Http\Controllers\Api\Mobile\Auth;

use App\DTOs\Auth\LoginRequestDTO;
use App\Exceptions\InvalidCredentialsException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\Auth\LoginRequest;
use App\Services\Auth\AuthService;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
                code: ApiErrorCode::UNAUTHORIZED,
                status: 401,
            );
        }

        return ApiResponse::success(
            message: 'Login berhasil',
            data: $responseDTO->toArray(),
        );
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return ApiResponse::success(
            message: 'Logout berhasil',
            data: null,
        );
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(
            message: 'Profil user berhasil diambil',
            data: $this->authService->currentUserProfile($request->user()),
        );
    }
}
