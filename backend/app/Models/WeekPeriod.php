<?php

namespace App\Models;

use App\Enums\WeekStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeekPeriod extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'start_date',
        'end_date',
        'status',
        'locked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'locked_at' => 'datetime',
            'status' => WeekStatus::class,
        ];
    }

    public function dailyWages(): HasMany
    {
        return $this->hasMany(DailyWage::class, 'week_period_id');
    }

    public function weeklyPayments(): HasMany
    {
        return $this->hasMany(WeeklyPayment::class, 'week_period_id');
    }
}

