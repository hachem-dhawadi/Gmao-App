<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_sites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->unique(['member_id', 'site_id']);
            $table->timestamps();
        });

        // Migrate existing site_id values into the pivot
        DB::table('members')
            ->whereNotNull('site_id')
            ->select(['id', 'site_id'])
            ->orderBy('id')
            ->each(function ($member) {
                DB::table('member_sites')->insertOrIgnore([
                    'member_id'  => $member->id,
                    'site_id'    => $member->site_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_sites');
    }
};
