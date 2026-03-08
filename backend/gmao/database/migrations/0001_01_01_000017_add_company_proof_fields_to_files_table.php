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
        Schema::table('files', function (Blueprint $table) {
            $table->string('category')->nullable()->after('item_id');
            $table->boolean('is_verified')->default(false)->after('checksum');
            $table->dateTime('verified_at')->nullable()->after('is_verified');
            $table->foreignId('verified_by_user_id')->nullable()->after('verified_at')->index();

            $table->foreign('verified_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropForeign(['verified_by_user_id']);
            $table->dropColumn(['category', 'is_verified', 'verified_at', 'verified_by_user_id']);
        });
    }
};
