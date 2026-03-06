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
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('parent_department_id')->nullable()->index();
            $table->string('name');
            $table->string('code');
            $table->text('description')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('parent_department_id')
                ->references('id')
                ->on('departments')
                ->nullOnDelete();
            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->unique(['company_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};

