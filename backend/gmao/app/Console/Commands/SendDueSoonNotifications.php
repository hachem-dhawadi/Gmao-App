<?php

namespace App\Console\Commands;

use App\Models\WorkOrder;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendDueSoonNotifications extends Command
{
    protected $signature   = 'wo:notify-due-soon';
    protected $description = 'Send early warning notifications for work orders due within 48 hours';

    public function handle(): int
    {
        $now      = Carbon::now();
        $window   = $now->copy()->addHours(48);

        $dueSoonWos = WorkOrder::query()
            ->whereNotNull('due_at')
            ->where('due_at', '>', $now)
            ->where('due_at', '<=', $window)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNull('archived_at')
            ->with(['assignedMember.user'])
            ->get();

        if ($dueSoonWos->isEmpty()) {
            $this->info('No work orders due within 48 hours.');
            return self::SUCCESS;
        }

        foreach ($dueSoonWos as $wo) {
            $hoursLeft = (int) $now->diffInHours(Carbon::parse($wo->due_at));
            NotificationService::notifyWoDueSoon($wo, $hoursLeft);
            $this->line("  ⏰ Due-soon notification sent for [{$wo->code}] {$wo->title} (in {$hoursLeft}h)");
            usleep(400000);
        }

        $this->info("Done. Notified for {$dueSoonWos->count()} work order(s) due within 48h.");

        return self::SUCCESS;
    }
}
