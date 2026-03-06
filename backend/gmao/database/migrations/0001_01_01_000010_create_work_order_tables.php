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
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('asset_id')->index()->constrained('assets');
            $table->string('code');
            $table->foreignId('created_by_member_id')->index()->constrained('members');
            $table->foreignId('closed_by_member_id')->nullable()->index();
            $table->string('status');
            $table->string('priority');
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('opened_at')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->dateTime('closed_at')->nullable();
            $table->integer('estimated_minutes')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('closed_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('work_order_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members')->cascadeOnDelete();
            $table->dateTime('assigned_at');
        });

        Schema::create('work_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('ended_at')->nullable();
            $table->integer('labor_minutes')->nullable();
            $table->decimal('labor_cost', 12, 2)->nullable();
            $table->boolean('is_billable')->default(false);
            $table->text('notes')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
        });

        Schema::create('work_order_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('changed_by_member_id')->index()->constrained('members');
            $table->string('old_status');
            $table->string('new_status');
            $table->text('note')->nullable();
            $table->dateTime('changed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_status_history');
        Schema::dropIfExists('work_logs');
        Schema::dropIfExists('work_order_members');
        Schema::dropIfExists('work_orders');
    }
};

