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
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('tax_number')->nullable();
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

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('code');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('barcode')->nullable();
            $table->string('unit');
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->decimal('min_stock', 14, 3)->nullable();
            $table->boolean('is_stocked')->default(true);
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

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->string('code')->nullable();
            $table->string('name');
            $table->string('location')->nullable();
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

        Schema::create('stock_moves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('item_id')->index()->constrained('items');
            $table->foreignId('warehouse_id')->index()->constrained('warehouses');
            $table->foreignId('work_order_id')->nullable()->index();
            $table->foreignId('supplier_id')->nullable()->index();
            $table->foreignId('created_by_member_id')->nullable()->index();
            $table->string('move_type');
            $table->decimal('quantity', 14, 3);
            $table->dateTime('moved_at');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();

            $table->foreign('work_order_id')
                ->references('id')
                ->on('work_orders')
                ->nullOnDelete();
            $table->foreign('supplier_id')
                ->references('id')
                ->on('suppliers')
                ->nullOnDelete();
            $table->foreign('created_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('supplier_id')->index()->constrained('suppliers');
            $table->string('code');
            $table->string('status');
            $table->dateTime('ordered_at')->nullable();
            $table->string('supplier_reference')->nullable();
            $table->dateTime('expected_delivery_at')->nullable();
            $table->text('supplier_note')->nullable();
            $table->foreignId('created_by_member_id')->index()->constrained('members');
            $table->foreignId('approved_by_member_id')->nullable()->index();
            $table->decimal('total_amount', 12, 2)->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->dateTime('archived_at')->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->index();
            $table->softDeletes();

            $table->foreign('approved_by_member_id')
                ->references('id')
                ->on('members')
                ->nullOnDelete();
            $table->foreign('archived_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('purchase_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->index()->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('item_id')->index()->constrained('items');
            $table->decimal('qty_ordered', 14, 3);
            $table->decimal('unit_price', 12, 2);
        });

        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->index()->constrained('purchase_orders')->cascadeOnDelete();
            $table->dateTime('received_at');
        });

        Schema::create('receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->index()->constrained('receipts')->cascadeOnDelete();
            $table->foreignId('purchase_order_line_id')->index()->constrained('purchase_order_lines')->cascadeOnDelete();
            $table->decimal('qty_received', 14, 3);
        });

        Schema::create('purchase_order_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->index()->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('changed_by_member_id')->index()->constrained('members');
            $table->string('old_status');
            $table->string('new_status');
            $table->text('note')->nullable();
            $table->dateTime('changed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_status_history');
        Schema::dropIfExists('receipt_lines');
        Schema::dropIfExists('receipts');
        Schema::dropIfExists('purchase_order_lines');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('stock_moves');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('items');
        Schema::dropIfExists('suppliers');
    }
};

