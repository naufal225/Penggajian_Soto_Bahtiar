<?php

namespace Tests\Feature\Api\Mobile\Dashboard;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_requires_authentication(): void
    {
        $response = $this->getJson('/api/mobile/dashboard');

        $response
            ->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => 'Anda belum login',
                'error' => [
                    'code' => 'UNAUTHORIZED',
                ],
            ]);
    }

    public function test_dashboard_returns_summary_data(): void
    {
        $user = User::factory()->create([
            'name' => 'Pak Bahtiar',
        ]);
        Sanctum::actingAs($user);

        Employee::factory()->for($user, 'createdBy')->create(['is_active' => true]);
        Employee::factory()->for($user, 'createdBy')->create(['is_active' => true]);
        Employee::factory()->for($user, 'createdBy')->create(['is_active' => false]);

        $response = $this->getJson('/api/mobile/dashboard');

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Dashboard berhasil diambil',
                'data' => [
                    'owner_name' => 'Pak Bahtiar',
                    'today_total_amount' => 0,
                    'active_employee_count' => 2,
                    'today_filled_count' => 0,
                    'today_unfilled_count' => 2,
                    'current_week' => [
                        'status' => 'open',
                        'is_locked' => false,
                        'total_amount' => 0,
                        'paid_employee_count' => 0,
                        'unpaid_employee_count' => 2,
                    ],
                    'quick_actions' => [
                        'can_input_today_wage' => true,
                        'can_process_payment' => true,
                        'can_export_current_week_pdf' => true,
                    ],
                ],
                'meta' => null,
            ])
            ->assertJsonStructure([
                'data' => [
                    'today_date',
                    'owner_name',
                    'today_total_amount',
                    'active_employee_count',
                    'today_filled_count',
                    'today_unfilled_count',
                    'current_week' => [
                        'id',
                        'start_date',
                        'end_date',
                        'status',
                        'is_locked',
                        'total_amount',
                        'paid_employee_count',
                        'unpaid_employee_count',
                    ],
                    'sync_info' => [
                        'server_time',
                        'recommended_pull_after',
                    ],
                    'quick_actions' => [
                        'can_input_today_wage',
                        'can_process_payment',
                        'can_export_current_week_pdf',
                    ],
                ],
            ]);
    }
}
