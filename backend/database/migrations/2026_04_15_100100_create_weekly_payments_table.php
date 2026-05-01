<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('week_period_id')->constrained('week_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('payment_scope', 20);
            $table->unsignedBigInteger('total_amount');
            $table->timestamp('paid_at');
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->text('notes')->nullable();
            $table->boolean('is_voided')->default(false);
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('void_reason')->nullable();
            $table->timestamps();

            $table->index('week_period_id');
            $table->index('employee_id');
            $table->index('payment_scope');
            $table->index('paid_at');
            $table->index(['week_period_id', 'is_voided']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_payments');
    }
};

