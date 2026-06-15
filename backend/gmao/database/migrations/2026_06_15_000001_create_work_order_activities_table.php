<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_order_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('actor_member_id')->nullable()->index()->constrained('members')->nullOnDelete();
            $table->string('type'); // assigned, unassigned, comment_added, attachment_added, work_log_added, part_used
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_activities');
    }
};
