<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. work_orders.asset_id → nullOnDelete ──────────────────────────────
        Schema::table('work_orders', function (Blueprint $table) {
            $this->dropForeignIfExists('work_orders', 'asset_id');
            $table->foreign('asset_id')
                ->references('id')->on('assets')
                ->nullOnDelete();
        });

        // ── 2. notifications.user_id → cascadeOnDelete ──────────────────────────
        Schema::table('notifications', function (Blueprint $table) {
            $this->dropForeignIfExists('notifications', 'user_id');
            $table->foreign('user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();
        });

        // ── 3. work_logs.member_id → nullable + nullOnDelete ────────────────────
        Schema::table('work_logs', function (Blueprint $table) {
            $this->dropForeignIfExists('work_logs', 'member_id');
            $table->foreignId('member_id')->nullable()->change();
            $table->foreign('member_id')
                ->references('id')->on('members')
                ->nullOnDelete();
        });

        // ── 4. work_order_comments.member_id → nullable + nullOnDelete ───────────
        Schema::table('work_order_comments', function (Blueprint $table) {
            $this->dropForeignIfExists('work_order_comments', 'member_id');
            $table->foreignId('member_id')->nullable()->change();
            $table->foreign('member_id')
                ->references('id')->on('members')
                ->nullOnDelete();
        });

        // ── 5. work_order_attachments.member_id → nullable + nullOnDelete ────────
        Schema::table('work_order_attachments', function (Blueprint $table) {
            $this->dropForeignIfExists('work_order_attachments', 'member_id');
            $table->foreignId('member_id')->nullable()->change();
            $table->foreign('member_id')
                ->references('id')->on('members')
                ->nullOnDelete();
        });

        // ── 6. work_order_status_history.changed_by_member_id ───────────────────
        Schema::table('work_order_status_history', function (Blueprint $table) {
            $this->dropForeignIfExists('work_order_status_history', 'changed_by_member_id');
            $table->foreignId('changed_by_member_id')->nullable()->change();
            $table->foreign('changed_by_member_id')
                ->references('id')->on('members')
                ->nullOnDelete();
        });

        // ── 7. purchase_order_status_history.changed_by_member_id ───────────────
        Schema::table('purchase_order_status_history', function (Blueprint $table) {
            $this->dropForeignIfExists('purchase_order_status_history', 'changed_by_member_id');
            $table->foreignId('changed_by_member_id')->nullable()->change();
            $table->foreign('changed_by_member_id')
                ->references('id')->on('members')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $this->dropForeignIfExists('work_orders', 'asset_id');
            $table->foreign('asset_id')->references('id')->on('assets');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $this->dropForeignIfExists('notifications', 'user_id');
            $table->foreign('user_id')->references('id')->on('users');
        });

        Schema::table('work_logs', function (Blueprint $table) {
            $this->dropForeignIfExists('work_logs', 'member_id');
            $table->foreignId('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members');
        });

        Schema::table('work_order_comments', function (Blueprint $table) {
            $this->dropForeignIfExists('work_order_comments', 'member_id');
            $table->foreignId('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members');
        });

        Schema::table('work_order_attachments', function (Blueprint $table) {
            $this->dropForeignIfExists('work_order_attachments', 'member_id');
            $table->foreignId('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members');
        });

        Schema::table('work_order_status_history', function (Blueprint $table) {
            $this->dropForeignIfExists('work_order_status_history', 'changed_by_member_id');
            $table->foreignId('changed_by_member_id')->nullable(false)->change();
            $table->foreign('changed_by_member_id')->references('id')->on('members');
        });

        Schema::table('purchase_order_status_history', function (Blueprint $table) {
            $this->dropForeignIfExists('purchase_order_status_history', 'changed_by_member_id');
            $table->foreignId('changed_by_member_id')->nullable(false)->change();
            $table->foreign('changed_by_member_id')->references('id')->on('members');
        });
    }

    private function dropForeignIfExists(string $table, string $column): void
    {
        $fkName = $table . '_' . $column . '_foreign';
        $exists = DB::select(
            "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?",
            [$table, $fkName]
        );
        if ($exists) {
            Schema::table($table, function (Blueprint $bp) use ($column) {
                $bp->dropForeign([$column]);
            });
        }
    }
};
