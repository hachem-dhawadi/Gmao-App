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
        $users = DB::table('users')->select('id', 'phone')->orderBy('id')->get();
        $usedPhones = [];

        foreach ($users as $user) {
            $phone = is_string($user->phone) ? trim($user->phone) : '';

            if ($phone === '') {
                $phone = 'AUTO-'.$user->id;
            }

            if (strlen($phone) > 30) {
                $phone = substr($phone, 0, 30);
            }

            $candidate = $phone;
            $suffix = 1;

            while (in_array($candidate, $usedPhones, true)) {
                $suffixText = '-'.$suffix;
                $base = substr($phone, 0, 30 - strlen($suffixText));
                $candidate = $base.$suffixText;
                $suffix++;
            }

            $usedPhones[] = $candidate;

            DB::table('users')
                ->where('id', $user->id)
                ->update(['phone' => $candidate]);
        }

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY phone VARCHAR(30) NOT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(30)');
            DB::statement('ALTER TABLE users ALTER COLUMN phone SET NOT NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone', 30)->nullable(false)->change();
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
        });

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY phone VARCHAR(255) NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(255)');
            DB::statement('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone')->nullable()->change();
            });
        }
    }
};
