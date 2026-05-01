<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_wages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('week_period_id')->constrained('week_periods')->cascadeOnDelete();
            $table->date('wage_date');
            $table->unsignedBigInteger('amount');
            $table->text('notes')->nullable();
            $table->boolean('is_paid')->default(false);
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_weekly_payment_id')->nullable()->constrained('weekly_payments')->nullOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('client_uuid')->nullable()->unique();
            $table->timestamps();

            $table->unique(['employee_id', 'wage_date']);
            $table->index('week_period_id');
            $table->index('wage_date');
            $table->index('is_paid');
            $table->index(['employee_id', 'week_period_id']);
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_wages');
    }
};

