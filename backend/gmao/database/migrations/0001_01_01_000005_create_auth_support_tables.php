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
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index()->constrained('users');
            $table->string('device_type');
            $table->string('platform')->nullable();
            $table->string('device_uid');
            $table->string('push_token')->nullable();
            $table->string('app_version')->nullable();
            $table->string('os_version')->nullable();
            $table->dateTime('last_seen_at')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->softDeletes();

            $table->unique(['user_id', 'device_uid']);
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index()->constrained('users');
            $table->foreignId('device_id')->index()->constrained('devices');
            $table->dateTime('revoked_at')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index()->constrained('users');
            $table->string('email');
            $table->string('token_hash');
            $table->dateTime('created_at');

            $table->index('email');
        });

        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index()->constrained('users');
            $table->string('channel');
            $table->string('purpose');
            $table->string('code_hash');
            $table->dateTime('expires_at');
            $table->dateTime('consumed_at')->nullable();
            $table->integer('attempts')->default(0);
            $table->dateTime('created_at');
        });

        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index()->constrained('users');
            $table->string('provider', 50);
            $table->string('provider_user_id');
            $table->string('email')->nullable();
            $table->string('avatar_url')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['provider', 'provider_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('devices');
    }
};
