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
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('code');
            $table->string('label');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_system')->default(false);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('label');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->index()->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->index()->constrained('permissions')->cascadeOnDelete();

            $table->unique(['role_id', 'permission_id']);
        });

        Schema::create('member_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->index()->constrained('members')->cascadeOnDelete();
            $table->foreignId('role_id')->index()->constrained('roles')->cascadeOnDelete();

            $table->unique(['member_id', 'role_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};

