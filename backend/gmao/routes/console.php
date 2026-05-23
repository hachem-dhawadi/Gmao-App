<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run PM trigger check every hour
Schedule::command('pm:trigger')->hourly();

// Send overdue WO notifications daily at 8am
Schedule::command('wo:notify-overdue')->dailyAt('08:00');
