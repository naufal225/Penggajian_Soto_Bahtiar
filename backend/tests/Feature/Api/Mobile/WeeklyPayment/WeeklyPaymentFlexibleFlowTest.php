<?php

namespace Tests\Feature\Api\Mobile\WeeklyPayment;

use App\Enums\WeekStatus;
use App\Models\Employee;
use App\Models\User;
use App\Models\WeekPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WeeklyPaymentFlexibleFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_flexible_partial_payment_flow_matches_owner_scenario(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-11 09:00:00'));

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employeeA = Employee::factory()->for($user, 'createdBy')->create(['name' => 'A', 'is_active' => true]);
        $employeeB = Employee::factory()->for($user, 'createdBy')->create(['name' => 'B', 'is_active' => true]);
        $employeeC = Employee::factory()->for($user, 'createdBy')->create(['name' => 'C', 'is_active' => true]);

        $senin = '2026-05-11';
        $selasa = '2026-05-12';
        $rabu = '2026-05-13';
        $kamis = '2026-05-14';

        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeA->id, 'wage_date' => $senin, 'amount' => 50000])->assertOk();
        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeB->id, 'wage_date' => $senin, 'amount' => 40000])->assertOk();
        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeC->id, 'wage_date' => $senin, 'amount' => 40000])->assertOk();

        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeA->id, 'wage_date' => $selasa, 'amount' => 40000])->assertOk();
        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeB->id, 'wage_date' => $selasa, 'amount' => 40000])->assertOk();
        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeC->id, 'wage_date' => $selasa, 'amount' => 30000])->assertOk();

        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeA->id, 'wage_date' => $rabu, 'amount' => 50000])->assertOk();
        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeB->id, 'wage_date' => $rabu, 'amount' => 40000])->assertOk();
        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeC->id, 'wage_date' => $rabu, 'amount' => 40000])->assertOk();

        $weekPeriodId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $weekPeriodId,
            'employee_id' => $employeeA->id,
            'notes' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_amount', 140000)
            ->assertJsonPath('data.week_status_after_payment', WeekStatus::PartialPaid->value);

        $this->postJson('/api/mobile/daily-wages', ['employee_id' => $employeeA->id, 'wage_date' => $kamis, 'amount' => 45000])->assertOk();

        $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $weekPeriodId,
            'employee_id' => $employeeA->id,
            'notes' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_amount', 45000)
            ->assertJsonPath('data.week_status_after_payment', WeekStatus::PartialPaid->value);

        $this->postJson('/api/mobile/weekly-payments/all', [
            'week_period_id' => $weekPeriodId,
            'notes' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_amount', 230000)
            ->assertJsonPath('data.week_status_after_payment', WeekStatus::FullyPaid->value);

        $week = WeekPeriod::query()->findOrFail($weekPeriodId);
        $this->assertEquals(WeekStatus::FullyPaid, $week->status);
        $this->assertNotNull($week->locked_at);
    }

    public function test_undo_payment_is_forbidden_for_previous_week(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-05 09:00:00'));

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employee = Employee::factory()->for($user, 'createdBy')->create(['is_active' => true]);

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employee->id,
            'wage_date' => '2026-05-05',
            'amount' => 40000,
            'notes' => null,
        ])->assertOk();

        $weekPeriodId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $paymentId = (int) $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $weekPeriodId,
            'employee_id' => $employee->id,
            'notes' => null,
        ])->assertOk()->json('data.payment_id');

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-12 10:00:00'));

        // memicu minggu baru
        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employee->id,
            'wage_date' => '2026-05-12',
            'amount' => 50000,
            'notes' => null,
        ])->assertOk();

        $this->postJson("/api/mobile/weekly-payments/{$paymentId}/undo", [
            'reason' => 'uji minggu lama',
        ])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN_ACTION');
    }

    public function test_new_week_is_created_automatically_after_previous_week_is_fully_paid(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-19 09:00:00'));

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employee = Employee::factory()->for($user, 'createdBy')->create(['is_active' => true]);

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employee->id,
            'wage_date' => '2026-05-19',
            'amount' => 60000,
            'notes' => null,
        ])->assertOk();

        $firstWeekId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $this->postJson('/api/mobile/weekly-payments/all', [
            'week_period_id' => $firstWeekId,
            'notes' => null,
        ])->assertOk();

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-26 10:00:00'));

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employee->id,
            'wage_date' => '2026-05-26',
            'amount' => 70000,
            'notes' => null,
        ])->assertOk();

        $secondWeekId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $this->assertNotSame($firstWeekId, $secondWeekId);
    }

    public function test_history_cards_endpoint_returns_one_card_per_employee_for_each_payment(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-11 09:00:00'));

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employeeA = Employee::factory()->for($user, 'createdBy')->create(['name' => 'Asep', 'is_active' => true]);
        $employeeB = Employee::factory()->for($user, 'createdBy')->create(['name' => 'Budi', 'is_active' => true]);
        $employeeC = Employee::factory()->for($user, 'createdBy')->create(['name' => 'Cici', 'is_active' => true]);

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeA->id,
            'wage_date' => '2026-05-11',
            'amount' => 50000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeB->id,
            'wage_date' => '2026-05-11',
            'amount' => 40000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeC->id,
            'wage_date' => '2026-05-11',
            'amount' => 30000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeA->id,
            'wage_date' => '2026-05-12',
            'amount' => 60000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeB->id,
            'wage_date' => '2026-05-12',
            'amount' => 45000,
            'notes' => null,
        ])->assertOk();

        $weekPeriodId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-11 09:00:00'));
        $employeePaymentId = (int) $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $weekPeriodId,
            'employee_id' => $employeeA->id,
            'notes' => 'Bayar Asep',
        ])->assertOk()->json('data.payment_id');

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-11 09:05:00'));
        $this->postJson('/api/mobile/weekly-payments/all', [
            'week_period_id' => $weekPeriodId,
            'notes' => 'Bayar sisa minggu ini',
        ])->assertOk();

        $response = $this->getJson("/api/mobile/weekly-payments/history-cards?week_period_id={$weekPeriodId}&page=1&per_page=20")
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonCount(3, 'data');

        $cards = collect($response->json('data'));

        $this->assertSame(
            [
                "payment-2-employee-{$employeeB->id}",
                "payment-2-employee-{$employeeC->id}",
                "payment-1-employee-{$employeeA->id}",
            ],
            $cards->pluck('history_item_id')->all()
        );

        $this->assertSame(
            ['Budi', 'Cici', 'Asep'],
            $cards->pluck('employee_name')->all()
        );

        $this->assertSame(
            [85000, 30000, 110000],
            $cards->pluck('total_amount')->all()
        );

        $this->assertSame(
            ['all', 'all', 'employee'],
            $cards->pluck('payment_scope')->all()
        );

        $this->assertSame(
            [false, false, false],
            $cards->pluck('can_undo')->all()
        );

        $this->assertSame($employeePaymentId, $cards->last()['payment_id']);
    }

    public function test_history_cards_endpoint_excludes_voided_payment_and_marks_previous_week_as_not_undoable(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-05 09:00:00'));

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $employeeA = Employee::factory()->for($user, 'createdBy')->create(['name' => 'Asep', 'is_active' => true]);
        $employeeB = Employee::factory()->for($user, 'createdBy')->create(['name' => 'Budi', 'is_active' => true]);

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeA->id,
            'wage_date' => '2026-05-05',
            'amount' => 40000,
            'notes' => null,
        ])->assertOk();

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeB->id,
            'wage_date' => '2026-05-05',
            'amount' => 50000,
            'notes' => null,
        ])->assertOk();

        $previousWeekId = (int) $this->getJson('/api/mobile/week-periods/current')->assertOk()->json('data.id');

        $voidedPaymentId = (int) $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $previousWeekId,
            'employee_id' => $employeeA->id,
            'notes' => 'Pembayaran salah',
        ])->assertOk()->json('data.payment_id');

        $this->postJson("/api/mobile/weekly-payments/{$voidedPaymentId}/undo", [
            'reason' => 'Salah catat',
        ])->assertOk();

        $activePaymentId = (int) $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $previousWeekId,
            'employee_id' => $employeeA->id,
            'notes' => 'Pembayaran benar',
        ])->assertOk()->json('data.payment_id');

        $this->postJson('/api/mobile/weekly-payments/employee', [
            'week_period_id' => $previousWeekId,
            'employee_id' => $employeeB->id,
            'notes' => 'Pembayaran Budi',
        ])->assertOk();

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-05-12 10:00:00'));

        $this->postJson('/api/mobile/daily-wages', [
            'employee_id' => $employeeA->id,
            'wage_date' => '2026-05-12',
            'amount' => 50000,
            'notes' => null,
        ])->assertOk();

        $response = $this->getJson("/api/mobile/weekly-payments/history-cards?week_period_id={$previousWeekId}&page=1&per_page=20")
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $cards = collect($response->json('data'));
        $activeCard = $cards->firstWhere('payment_id', $activePaymentId);

        $this->assertNotNull($activeCard);
        $this->assertSame(40000, $activeCard['total_amount']);
        $this->assertFalse($activeCard['can_undo']);
        $this->assertFalse($cards->pluck('payment_id')->contains($voidedPaymentId));
    }
}
