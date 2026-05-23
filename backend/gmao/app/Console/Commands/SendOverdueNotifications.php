<?php

namespace App\Console\Commands;

use App\Models\WorkOrder;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendOverdueNotifications extends Command
{
    protected $signature   = 'wo:notify-overdue';
    protected $description = 'Send overdue notifications for work orders past their due date';

    public function handle(): int
    {
        $now = Carbon::now();

        $overdueWos = WorkOrder::query()
            ->whereNotNull('due_at')
            ->where('due_at', '<', $now)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with(['assignedMembers.user'])
            ->get();

        if ($overdueWos->isEmpty()) {
            $this->info('No overdue work orders found.');
            return self::SUCCESS;
        }

        foreach ($overdueWos as $wo) {
            NotificationService::notifyWoOverdue($wo);
            $this->line("  ✓ Notified for overdue WO [{$wo->code}] {$wo->title}");
        }

        $this->info("Done. Notified for {$overdueWos->count()} overdue work order(s).");

        return self::SUCCESS;
    }
}
