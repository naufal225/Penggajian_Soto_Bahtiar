<?php

namespace Tests\Feature\Api\Mobile\Employee;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_endpoints_require_authentication(): void
    {
        $response = $this->getJson('/api/mobile/employees');

        $response
            ->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => 'Anda belum login',
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'details' => null,
                    'fields' => null,
                ],
            ]);
    }
}
