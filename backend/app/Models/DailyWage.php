<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyWage extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'employee_id',
        'week_period_id',
        'wage_date',
        'amount',
        'notes',
        'is_paid',
        'paid_at',
        'paid_weekly_payment_id',
        'created_by_user_id',
        'updated_by_user_id',
        'client_uuid',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'wage_date' => 'date:Y-m-d',
            'amount' => 'int',
            'is_paid' => 'bool',
            'paid_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function weekPeriod(): BelongsTo
    {
        return $this->belongsTo(WeekPeriod::class, 'week_period_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(WeeklyPayment::class, 'paid_weekly_payment_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}

