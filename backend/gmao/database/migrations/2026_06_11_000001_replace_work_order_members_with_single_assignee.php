<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->foreignId('assigned_member_id')
                ->nullable()
                ->after('team_id')
                ->index()
                ->constrained('members')
                ->nullOnDelete();
        });

        Schema::dropIfExists('work_order_members');
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_member_id');
        });

        Schema::create('work_order_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members')->cascadeOnDelete();
            $table->dateTime('assigned_at');
        });
    }
};
