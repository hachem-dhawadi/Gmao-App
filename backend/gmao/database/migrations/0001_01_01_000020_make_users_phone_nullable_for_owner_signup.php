<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY phone VARCHAR(30) NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone', 30)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $usersWithNullPhone = DB::table('users')
            ->whereNull('phone')
            ->select('id')
            ->get();

        foreach ($usersWithNullPhone as $user) {
            DB::table('users')
                ->where('id', $user->id)
                ->update(['phone' => 'AUTO-'.$user->id]);
        }

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY phone VARCHAR(30) NOT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN phone SET NOT NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone', 30)->nullable(false)->change();
            });
        }
    }
};