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
        Schema::create('chat_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('type');
            $table->string('context_type');
            $table->foreignId('work_order_id')->nullable()->index();
            $table->foreignId('created_by_member_id')->index()->constrained('members');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('work_order_id')
                ->references('id')
                ->on('work_orders')
                ->nullOnDelete();
            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        Schema::create('chat_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_thread_id')->index()->constrained('chat_threads')->cascadeOnDelete();
            $table->foreignId('member_id')->index()->constrained('members')->cascadeOnDelete();
            $table->string('participant_role');
            $table->dateTime('joined_at');
            $table->dateTime('left_at')->nullable();

            $table->unique(['chat_thread_id', 'member_id']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_thread_id')->index()->constrained('chat_threads')->cascadeOnDelete();
            $table->foreignId('sender_member_id')->index()->constrained('members');
            $table->foreignId('deleted_by_member_id')->nullable()->index();
            $table->string('message_type');
            $table->text('text')->nullable();
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->softDeletes();

            $table->foreign('deleted_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });

        Schema::create('chat_message_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_message_id')->index()->constrained('chat_messages')->cascadeOnDelete();
            $table->foreignId('file_id')->index()->constrained('files')->cascadeOnDelete();
            $table->dateTime('created_at');

            $table->unique(['chat_message_id', 'file_id']);
        });

        Schema::create('chat_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_thread_id')->index()->constrained('chat_threads')->cascadeOnDelete();
            $table->foreignId('started_by_member_id')->index()->constrained('members');
            $table->string('call_type');
            $table->string('status');
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_calls');
        Schema::dropIfExists('chat_message_files');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chat_threads');
    }
};

