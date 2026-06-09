<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('address');
            $table->string('timezone', 100)->default('UTC')->after('phone');
            $table->boolean('is_active')->default(true)->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->dropColumn(['phone', 'timezone', 'is_active']);
        });
    }
};
