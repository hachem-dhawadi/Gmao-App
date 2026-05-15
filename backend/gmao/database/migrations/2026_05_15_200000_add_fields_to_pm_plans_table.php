<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pm_plans', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->string('priority')->default('medium')->after('status');
            $table->integer('estimated_minutes')->nullable()->after('priority');
            $table->foreignId('created_by_member_id')->nullable()->after('estimated_minutes')
                ->constrained('members')->nullOnDelete();
            $table->foreignId('assigned_member_id')->nullable()->after('created_by_member_id')
                ->constrained('members')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pm_plans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_member_id');
            $table->dropConstrainedForeignId('created_by_member_id');
            $table->dropColumn(['description', 'priority', 'estimated_minutes']);
        });
    }
};
