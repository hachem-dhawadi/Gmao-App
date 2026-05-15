<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_order_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members');
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('work_order_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->index()->constrained('work_orders')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members');
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type')->nullable();
            $table->bigInteger('size_bytes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_attachments');
        Schema::dropIfExists('work_order_comments');
    }
};
