<?php

namespace App\Console\Commands;

use App\Models\PmPlan;
use App\Models\PmTrigger;
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
            usleep(400000); // 400 ms — stay under Mailtrap free-plan rate limit
        }

        $this->info("Done. Notified for {$overdueWos->count()} overdue work order(s).");

        // ── PM Plans overdue ──────────────────────────────────────────────────
        $overdueTriggers = PmTrigger::query()
            ->where('next_run_at', '<', $now)
            ->whereHas('pmPlan', fn ($q) => $q->where('status', 'active'))
            ->with(['pmPlan.assignedTo.user'])
            ->get();

        foreach ($overdueTriggers as $trigger) {
            $plan = $trigger->pmPlan;
            if (! $plan) continue;
            NotificationService::notifyPmOverdue($plan, $trigger);
            $this->line("  ✓ PM overdue notification sent for [{$plan->code}] {$plan->name}");
        }

        if ($overdueTriggers->isNotEmpty()) {
            $this->info("Done. Notified for {$overdueTriggers->count()} overdue PM plan(s).");
        }

        return self::SUCCESS;
    }
}
