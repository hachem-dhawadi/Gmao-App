<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fixes incorrect FK cascade behaviors found during audit:
 *
 * 1. work_orders.asset_id         — column is nullable but FK was still RESTRICT → nullOnDelete
 * 2. notifications.user_id        — RESTRICT, should cascade-delete with user
 * 3. work_logs.member_id          — RESTRICT, make nullable + nullOnDelete
 * 4. work_order_comments.member_id          — same
 * 5. work_order_attachments.member_id       — same
 * 6. work_order_status_history.changed_by_member_id — same
 * 7. purchase_order_status_history.changed_by_member_id — same
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. work_orders.asset_id → nullOnDelete ──────────────────────────────
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['asset_id']);
            $table->foreign('asset_id')
                ->references('id')
                ->on('assets')
                ->nullOnDelete();
        });

        // ── 2. notifications.user_id → cascadeOnDelete ──────────────────────────
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });

        // ── 3. work_logs.member_id → nullable + nullOnDelete ────────────────────
        Schema::table('work_logs', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->foreignId('member_id')->nullable()->change();
            $table->foreign('member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });

        // ── 4. work_order_comments.member_id → nullable + nullOnDelete ───────────
        Schema::table('work_order_comments', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->foreignId('member_id')->nullable()->change();
            $table->foreign('member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });

        // ── 5. work_order_attachments.member_id → nullable + nullOnDelete ────────
        Schema::table('work_order_attachments', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->foreignId('member_id')->nullable()->change();
            $table->foreign('member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });

        // ── 6. work_order_status_history.changed_by_member_id → nullable + nullOnDelete
        Schema::table('work_order_status_history', function (Blueprint $table) {
            $table->dropForeign(['changed_by_member_id']);
            $table->foreignId('changed_by_member_id')->nullable()->change();
            $table->foreign('changed_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });

        // ── 7. purchase_order_status_history.changed_by_member_id → nullable + nullOnDelete
        Schema::table('purchase_order_status_history', function (Blueprint $table) {
            $table->dropForeign(['changed_by_member_id']);
            $table->foreignId('changed_by_member_id')->nullable()->change();
            $table->foreign('changed_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        // Reverse: restore original RESTRICT behavior

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['asset_id']);
            $table->foreign('asset_id')->references('id')->on('assets');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')->references('id')->on('users');
        });

        Schema::table('work_logs', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->foreignId('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members');
        });

        Schema::table('work_order_comments', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->foreignId('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members');
        });

        Schema::table('work_order_attachments', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->foreignId('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members');
        });

        Schema::table('work_order_status_history', function (Blueprint $table) {
            $table->dropForeign(['changed_by_member_id']);
            $table->foreignId('changed_by_member_id')->nullable(false)->change();
            $table->foreign('changed_by_member_id')->references('id')->on('members');
        });

        Schema::table('purchase_order_status_history', function (Blueprint $table) {
            $table->dropForeign(['changed_by_member_id']);
            $table->foreignId('changed_by_member_id')->nullable(false)->change();
            $table->foreign('changed_by_member_id')->references('id')->on('members');
        });
    }
};
