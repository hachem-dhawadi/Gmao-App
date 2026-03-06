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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        Schema::create('schedule_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->index()->constrained('schedules')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
        });

        Schema::create('schedule_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->index()->constrained('schedules')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members')->cascadeOnDelete();
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
        });

        Schema::create('punches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->index()->constrained('members');
            $table->foreignId('device_id')->index()->constrained('devices');
            $table->dateTime('punched_at');
            $table->string('punch_type');
            $table->decimal('geo_lat', 10, 7)->nullable();
            $table->decimal('geo_lng', 10, 7)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('punches');
        Schema::dropIfExists('schedule_members');
        Schema::dropIfExists('schedule_rules');
        Schema::dropIfExists('schedules');
    }
};

