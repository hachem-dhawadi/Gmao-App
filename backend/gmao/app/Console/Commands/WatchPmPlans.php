<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class WatchPmPlans extends Command
{
    protected $signature   = 'pm:watch {--interval=60 : Check interval in seconds}';
    protected $description = 'Dev watcher — checks for due PM plans every N seconds and creates work orders';

    public function handle(): int
    {
        $interval = (int) $this->option('interval');

        $this->info('PM watcher started. Checking every ' . $interval . 's. Press Ctrl+C to stop.');
        $this->newLine();

        while (true) {
            $this->line('[' . now()->format('H:i:s') . '] Checking for due PM plans...');

            $this->call('pm:trigger');

            $this->line('[' . now()->format('H:i:s') . '] Next check in ' . $interval . 's.');
            $this->newLine();

            sleep($interval);
        }

        return self::SUCCESS;
    }
}
