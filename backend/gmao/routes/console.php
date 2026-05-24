<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run PM trigger check every hour
Schedule::command('pm:trigger')->hourly();

// Send due-soon WO notifications daily at 7am (48h early warning)
Schedule::command('wo:notify-due-soon')->dailyAt('07:00');

// Send overdue WO notifications daily at 8am
Schedule::command('wo:notify-overdue')->dailyAt('08:00');
