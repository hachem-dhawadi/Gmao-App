<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pm_plans', function (Blueprint $table) {
            $table->foreignId('team_id')
                ->nullable()
                ->after('assigned_member_id')
                ->constrained('teams')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pm_plans', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Team::class);
            $table->dropColumn('team_id');
        });
    }
};
