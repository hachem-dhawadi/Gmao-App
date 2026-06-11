<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_checklist_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->index()->constrained('assets')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('order_index')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_checklist_templates');
    }
};
