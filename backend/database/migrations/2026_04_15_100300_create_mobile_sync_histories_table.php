<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_sync_histories', function (Blueprint $table) {
            $table->id();
            $table->string('device_id');
            $table->string('action_type', 50);
            $table->string('entity_type', 50);
            $table->string('entity_local_id')->nullable();
            $table->unsignedBigInteger('entity_server_id')->nullable();
            $table->string('sync_status', 20);
            $table->text('error_message')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->index('device_id');
            $table->index('entity_type');
            $table->index('sync_status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_sync_histories');
    }
};

