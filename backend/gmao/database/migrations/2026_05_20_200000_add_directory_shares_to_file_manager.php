<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fm_directory_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fm_directory_id')->constrained('fm_directories')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['fm_directory_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fm_directory_shares');
    }
};
