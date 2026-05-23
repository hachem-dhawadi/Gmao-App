<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pm_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pm_plan_id')->constrained('pm_plans')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('order_index')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pm_tasks');
    }
};
