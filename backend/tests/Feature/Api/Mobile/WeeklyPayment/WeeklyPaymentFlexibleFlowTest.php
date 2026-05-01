<?php

namespace Tests\Feature\Api\Mobile\WeeklyPayment;

use App\Models\Employee;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WeeklyPaymentFlexibleFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_be_paid_multiple_times_in_same_week_after_new_daily_wage_added(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employee = Employee::factory()->for($user, 'createdBy')->create([
            'is_active' => true,
        ]);

        $today = CarbonImmutable::now()->format('Y-m-d');
        $tomorrow = CarbonImmutable::now()->addDay()->format('Y-m-d');

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employee->id,
            'wage_date' => $today,
            'amount' => 40000,
            'notes' => null,
        ])->assertOk();

        $weekPeriodId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $weekPeriodId,
            'employee_id' => $employee->id,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employee->id,
            'wage_date' => $tomorrow,
            'amount' => 50000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $weekPeriodId,
            'employee_id' => $employee->id,
            'notes' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_amount', 50000);
    }

    public function test_pay_all_can_be_called_again_after_new_daily_wages_are_added(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employeeOne = Employee::factory()->for($user, 'createdBy')->create(['is_active' => true]);
        $employeeTwo = Employee::factory()->for($user, 'createdBy')->create(['is_active' => true]);

        $today = CarbonImmutable::now()->format('Y-m-d');
        $tomorrow = CarbonImmutable::now()->addDay()->format('Y-m-d');

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeOne->id,
            'wage_date' => $today,
            'amount' => 40000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeTwo->id,
            'wage_date' => $today,
            'amount' => 70000,
            'notes' => null,
        ])->assertOk();

        $weekPeriodId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $this->postJson('/api/mobile/weekly-payments/all', [
            'week_period_id' => $weekPeriodId,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeOne->id,
            'wage_date' => $tomorrow,
            'amount' => 50000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/weekly-payments/all', [
            'week_period_id' => $weekPeriodId,
            'notes' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_amount', 50000)
            ->assertJsonPath('data.paid_employee_count', 1);
    }
}

