<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'phone_number' => $this->faker->optional()->numerify('08##########'),
            'notes' => $this->faker->optional()->sentence(),
            'is_active' => true,
            'created_by_user_id' => User::factory(),
            'updated_by_user_id' => null,
        ];
    }
}
