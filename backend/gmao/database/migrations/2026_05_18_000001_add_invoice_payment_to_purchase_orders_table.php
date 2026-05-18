<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('invoice_number', 100)->nullable()->after('supplier_note');
            $table->date('invoice_date')->nullable()->after('invoice_number');
            $table->decimal('invoice_amount', 12, 2)->nullable()->after('invoice_date');
            $table->enum('payment_status', ['pending', 'paid', 'disputed'])->nullable()->after('invoice_amount');
            $table->timestamp('paid_at')->nullable()->after('payment_status');
            $table->string('payment_note', 1000)->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn([
                'invoice_number',
                'invoice_date',
                'invoice_amount',
                'payment_status',
                'paid_at',
                'payment_note',
            ]);
        });
    }
};
