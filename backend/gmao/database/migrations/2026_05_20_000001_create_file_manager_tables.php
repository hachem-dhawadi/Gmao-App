<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fm_directories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('created_by_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('fm_directories')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->index(['company_id', 'parent_id']);
        });

        Schema::create('fm_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('fm_directory_id')->nullable()->constrained('fm_directories')->cascadeOnDelete();
            $table->foreignId('uploaded_by_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type')->default('application/octet-stream');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'fm_directory_id']);
        });

        Schema::create('fm_file_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fm_file_id')->constrained('fm_files')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['fm_file_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fm_file_shares');
        Schema::dropIfExists('fm_files');
        Schema::dropIfExists('fm_directories');
    }
};
