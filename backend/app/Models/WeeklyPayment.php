<?php

namespace App\Models;

use App\Enums\PaymentScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyPayment extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'week_period_id',
        'employee_id',
        'payment_scope',
        'total_amount',
        'paid_at',
        'created_by_user_id',
        'notes',
        'is_voided',
        'voided_at',
        'voided_by_user_id',
        'void_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'paid_at' => 'datetime',
            'is_voided' => 'bool',
            'voided_at' => 'datetime',
            'payment_scope' => PaymentScope::class,
            'total_amount' => 'int',
        ];
    }

    public function weekPeriod(): BelongsTo
    {
        return $this->belongsTo(WeekPeriod::class, 'week_period_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by_user_id');
    }

    public function dailyWages(): HasMany
    {
        return $this->hasMany(DailyWage::class, 'paid_weekly_payment_id');
    }
}

