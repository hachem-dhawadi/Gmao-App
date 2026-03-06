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
        Schema::create('asset_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('asset_type_id')->index()->constrained('asset_types');
            $table->string('code');
            $table->string('name');
            $table->string('status');
            $table->string('serial_number')->nullable();
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->string('location')->nullable();
            $table->string('address_label')->nullable();
            $table->text('address_text')->nullable();
            $table->decimal('geo_lat', 10, 7)->nullable();
            $table->decimal('geo_lng', 10, 7)->nullable();
            $table->date('purchase_date')->nullable();
            $table->date('warranty_end_at')->nullable();
            $table->dateTime('installed_at')->nullable();
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

        Schema::create('fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->index()->constrained('companies');
            $table->foreignId('asset_type_id')->index()->constrained('asset_types');
            $table->string('name');
            $table->string('label');
            $table->string('data_type');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_unique')->default(false);
            $table->integer('sort_order')->default(0);
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

        Schema::create('asset_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->index()->constrained('assets')->cascadeOnDelete();
            $table->foreignId('field_id')->index()->constrained('fields')->cascadeOnDelete();
            $table->text('value')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['asset_id', 'field_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_values');
        Schema::dropIfExists('fields');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('asset_types');
    }
};

