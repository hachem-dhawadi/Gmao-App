<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pm_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('code');
            $table->string('name');
            $table->string('status');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('pm_plan_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pm_plan_id')->index()->constrained('pm_plans')->cascadeOnDelete();
            $table->foreignId('asset_id')->index()->constrained('assets')->cascadeOnDelete();
        });

        Schema::create('pm_triggers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pm_plan_id')->index()->constrained('pm_plans')->cascadeOnDelete();
            $table->string('trigger_type');
            $table->integer('interval_value');
            $table->string('interval_unit');
            $table->dateTime('next_run_at')->nullable();
            $table->dateTime('last_run_at')->nullable();
        });

        Schema::create('pm_work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pm_plan_id')->index()->constrained('pm_plans')->cascadeOnDelete();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pm_work_orders');
        Schema::dropIfExists('pm_triggers');
        Schema::dropIfExists('pm_plan_assets');
        Schema::dropIfExists('pm_plans');
    }
};

