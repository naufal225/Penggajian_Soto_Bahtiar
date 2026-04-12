<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Seeder;

class OwnerAndEmployeesSeeder extends Seeder
{
    /**
     * Seed owner and initial employees.
     */
    public function run(): void
    {
        $owner = User::query()->updateOrCreate(
            ['email' => 'owner@sotobahtiar.local'],
            [
                'name' => 'Owner Soto Bahtiar',
                'password' => 'owner12345',
            ]
        );

        $employees = [
            [
                'name' => 'Asep',
                'phone_number' => '081230000001',
                'notes' => 'Shift pagi',
            ],
            [
                'name' => 'Budi',
                'phone_number' => '081230000002',
                'notes' => 'Shift siang',
            ],
            [
                'name' => 'Cecep',
                'phone_number' => '081230000003',
                'notes' => 'Shift malam',
            ],
            [
                'name' => 'Deni',
                'phone_number' => '081230000004',
                'notes' => null,
            ],
        ];

        foreach ($employees as $employee) {
            Employee::query()->updateOrCreate(
                [
                    'name' => $employee['name'],
                    'created_by_user_id' => $owner->id,
                ],
                [
                    'phone_number' => $employee['phone_number'],
                    'notes' => $employee['notes'],
                    'is_active' => true,
                    'updated_by_user_id' => $owner->id,
                ]
            );
        }
    }
}
