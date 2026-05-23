<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->string('failure_code')->nullable()->after('description');
            $table->string('root_cause')->nullable()->after('failure_code');
            $table->text('resolution_notes')->nullable()->after('root_cause');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn(['failure_code', 'root_cause', 'resolution_notes']);
        });
    }
};
