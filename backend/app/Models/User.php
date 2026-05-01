<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function createdEmployees(): HasMany
    {
        return $this->hasMany(Employee::class, 'created_by_user_id');
    }

    public function updatedEmployees(): HasMany
    {
        return $this->hasMany(Employee::class, 'updated_by_user_id');
    }

    public function createdDailyWages(): HasMany
    {
        return $this->hasMany(DailyWage::class, 'created_by_user_id');
    }

    public function updatedDailyWages(): HasMany
    {
        return $this->hasMany(DailyWage::class, 'updated_by_user_id');
    }

    public function createdWeeklyPayments(): HasMany
    {
        return $this->hasMany(WeeklyPayment::class, 'created_by_user_id');
    }
}
