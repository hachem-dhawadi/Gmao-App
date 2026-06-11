<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('approved_by_member_id')->nullable()->after('closed_by_member_id');
            $table->timestamp('approved_at')->nullable()->after('approved_by_member_id');

            $table->foreign('approved_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['approved_by_member_id']);
            $table->dropColumn(['approved_by_member_id', 'approved_at']);
        });
    }
};
