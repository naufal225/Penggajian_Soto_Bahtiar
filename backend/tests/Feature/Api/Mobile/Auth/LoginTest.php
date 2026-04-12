<?php

namespace Tests\Feature\Api\Mobile\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_successfully_returns_token_and_user_data(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@warungsoto.com',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/api/mobile/auth/login', [
            'email' => 'owner@warungsoto.com',
            'password' => 'secret123',
            'device_name' => 'redmi-note-owner',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Login berhasil',
                'meta' => null,
            ])
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.email', 'owner@warungsoto.com')
            ->assertJsonPath('data.user.name', $user->name);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_login_returns_unauthorized_for_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'owner@warungsoto.com',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/api/mobile/auth/login', [
            'email' => 'owner@warungsoto.com',
            'password' => 'wrong-password',
            'device_name' => 'redmi-note-owner',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => 'Email atau password salah',
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'details' => null,
                    'fields' => null,
                ],
            ]);
    }

    public function test_login_returns_validation_error_when_payload_is_invalid(): void
    {
        $response = $this->postJson('/api/mobile/auth/login', [
            'email' => 'invalid-email',
            'password' => '',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJson([
                'success' => false,
                'message' => 'Data tidak valid',
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'details' => null,
                ],
            ])
            ->assertJsonStructure([
                'error' => [
                    'fields' => ['email', 'password', 'device_name'],
                ],
            ]);
    }
}
