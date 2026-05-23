<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('code');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['pending', 'converted', 'rejected'])->default('pending');
            $table->foreignId('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->string('location')->nullable();
            $table->foreignId('requested_by_member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('reviewed_by_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_requests');
    }
};
