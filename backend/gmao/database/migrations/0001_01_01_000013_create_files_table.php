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
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('uploaded_by_user_id')->index()->constrained('users');
            $table->foreignId('asset_id')->nullable()->index();
            $table->foreignId('work_order_id')->nullable()->index();
            $table->foreignId('item_id')->nullable()->index();
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('checksum')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('asset_id')
                ->references('id')
                ->on('assets')
                ->nullOnDelete();
            $table->foreign('work_order_id')
                ->references('id')
                ->on('work_orders')
                ->nullOnDelete();
            $table->foreign('item_id')
                ->references('id')
                ->on('items')
                ->nullOnDelete();
            $table->foreign('archived_by_user_id')
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
        Schema::dropIfExists('files');
    }
};

