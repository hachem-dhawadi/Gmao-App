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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('user_id')->index()->constrained('users');
            $table->foreignId('department_id')->nullable()->index();
            $table->foreignId('manager_member_id')->nullable()->index();
            $table->string('employee_code')->nullable();
            $table->string('job_title')->nullable();
            $table->date('hired_at')->nullable();
            $table->string('status');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->nullOnDelete();
            $table->foreign('manager_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->unique(['company_id', 'employee_code']);
            $table->unique(['company_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};

