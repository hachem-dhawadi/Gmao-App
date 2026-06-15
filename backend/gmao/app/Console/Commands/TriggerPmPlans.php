<?php

namespace App\Console\Commands;

use App\Models\PmTrigger;
use App\Services\PmWorkOrderService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class TriggerPmPlans extends Command
{
    protected $signature   = 'pm:trigger';
    protected $description = 'Generate work orders for PM plans whose next_run_at is due';

    public function handle(): int
    {
        $now = Carbon::now();

        $dueTriggers = PmTrigger::query()
            ->whereHas('pmPlan', fn ($q) => $q->where('status', 'active'))
            ->where('next_run_at', '<=', $now)
            ->with(['pmPlan.assets', 'pmPlan.company', 'pmPlan.tasks', 'pmPlan.triggers'])
            ->get();

        if ($dueTriggers->isEmpty()) {
            $this->info('No PM plans due. Nothing to do.');
            return self::SUCCESS;
        }

        $generated = 0;

        foreach ($dueTriggers as $trigger) {
            $plan = $trigger->pmPlan;

            if (! $plan || ! $plan->company) {
                continue;
            }

            try {
                $workOrder = PmWorkOrderService::generate($plan);
                $generated++;
                $this->line("  ✓ [{$plan->code}] {$plan->name} → {$workOrder->code}");
            } catch (\Throwable $e) {
                $this->error("  ✗ [{$plan->code}] {$plan->name} → {$e->getMessage()}");
            }
        }

        $this->info("Done. {$generated} work order(s) generated.");

        return self::SUCCESS;
    }
}
