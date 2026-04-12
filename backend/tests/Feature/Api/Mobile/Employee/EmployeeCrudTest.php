<?php

namespace Tests\Feature\Api\Mobile\Employee;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_employee_list_defaults_to_active_filter(): void
    {
        Employee::factory()->for($this->user, 'createdBy')->create([
            'name' => 'Budi',
            'is_active' => true,
        ]);
        Employee::factory()->for($this->user, 'createdBy')->create([
            'name' => 'Andi',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/mobile/employees');

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Daftar karyawan berhasil diambil',
            ])
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Budi')
            ->assertJsonMissing([
                'name' => 'Andi',
            ]);
    }

    public function test_can_create_employee(): void
    {
        $response = $this->postJson('/api/mobile/employees', [
            'name' => 'Asep',
            'phone_number' => '081298765432',
            'notes' => 'Shift pagi',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Karyawan berhasil ditambahkan',
                'meta' => null,
                'data' => [
                    'name' => 'Asep',
                    'phone_number' => '081298765432',
                    'notes' => 'Shift pagi',
                    'is_active' => true,
                ],
            ]);

        $this->assertDatabaseHas('employees', [
            'name' => 'Asep',
            'phone_number' => '081298765432',
            'notes' => 'Shift pagi',
            'is_active' => true,
            'created_by_user_id' => $this->user->id,
        ]);
    }

    public function test_create_employee_returns_validation_error_when_name_is_empty(): void
    {
        $response = $this->postJson('/api/mobile/employees', [
            'name' => '',
            'phone_number' => '0812',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJson([
                'success' => false,
                'message' => 'Data tidak valid',
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                ],
            ])
            ->assertJsonStructure([
                'error' => [
                    'fields' => ['name'],
                ],
            ]);
    }

    public function test_can_show_and_update_employee(): void
    {
        $employee = Employee::factory()->for($this->user, 'createdBy')->create([
            'name' => 'Budi',
            'phone_number' => '08123',
            'notes' => null,
            'is_active' => true,
        ]);

        $showResponse = $this->getJson("/api/mobile/employees/{$employee->id}");

        $showResponse
            ->assertOk()
            ->assertJsonPath('data.id', $employee->id)
            ->assertJsonPath('data.name', 'Budi');

        $updateResponse = $this->putJson("/api/mobile/employees/{$employee->id}", [
            'name' => 'Budi Santoso',
            'phone_number' => '08123456789',
            'notes' => 'Sering shift malam',
        ]);

        $updateResponse
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Data karyawan berhasil diperbarui',
                'data' => [
                    'id' => $employee->id,
                    'name' => 'Budi Santoso',
                    'phone_number' => '08123456789',
                    'notes' => 'Sering shift malam',
                    'is_active' => true,
                ],
            ]);
    }

    public function test_can_deactivate_and_activate_employee(): void
    {
        $employee = Employee::factory()->for($this->user, 'createdBy')->create([
            'is_active' => true,
        ]);

        $deactivateResponse = $this->patchJson("/api/mobile/employees/{$employee->id}/deactivate");
        $deactivateResponse
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Karyawan berhasil dinonaktifkan',
                'data' => [
                    'id' => $employee->id,
                    'is_active' => false,
                ],
            ]);

        $activateResponse = $this->patchJson("/api/mobile/employees/{$employee->id}/activate");
        $activateResponse
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Karyawan berhasil diaktifkan',
                'data' => [
                    'id' => $employee->id,
                    'is_active' => true,
                ],
            ]);
    }

    public function test_list_supports_search_and_inactive_filter(): void
    {
        Employee::factory()->for($this->user, 'createdBy')->create([
            'name' => 'Asep',
            'phone_number' => '08120001',
            'is_active' => false,
        ]);
        Employee::factory()->for($this->user, 'createdBy')->create([
            'name' => 'Budi',
            'phone_number' => '08120002',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/mobile/employees?status=inactive&search=sep');

        $response
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Asep');
    }

    public function test_returns_employee_not_found_error_for_unknown_employee_id(): void
    {
        $assertNotFoundEnvelope = function ($response): void {
            $response
                ->assertNotFound()
                ->assertJson([
                    'success' => false,
                    'message' => 'Karyawan tidak ditemukan',
                    'error' => [
                        'code' => 'EMPLOYEE_NOT_FOUND',
                        'details' => null,
                        'fields' => null,
                    ],
                ]);
        };

        $assertNotFoundEnvelope($this->getJson('/api/mobile/employees/999999'));
        $assertNotFoundEnvelope($this->putJson('/api/mobile/employees/999999', [
            'name' => 'Tidak Ada',
            'phone_number' => null,
            'notes' => null,
        ]));
        $assertNotFoundEnvelope($this->patchJson('/api/mobile/employees/999999/deactivate'));
        $assertNotFoundEnvelope($this->patchJson('/api/mobile/employees/999999/activate'));
    }
}
