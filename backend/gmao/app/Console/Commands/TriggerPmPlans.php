<?php

namespace App\Console\Commands;

use App\Models\PmPlan;
use App\Models\PmTrigger;
use App\Models\WorkOrder;
use App\Models\WorkOrderChecklistItem;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TriggerPmPlans extends Command
{
    protected $signature   = 'pm:trigger';
    protected $description = 'Generate work orders for PM plans whose next_run_at is due';

    public function handle(): int
    {
        $now = Carbon::now();

        // All active plans with a trigger that is due
        $dueTriggers = PmTrigger::query()
            ->whereHas('pmPlan', fn ($q) => $q->where('status', 'active'))
            ->where('next_run_at', '<=', $now)
            ->with(['pmPlan.assets', 'pmPlan.company', 'pmPlan.tasks'])
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

            DB::transaction(function () use ($plan, $trigger, $now) {
                // Generate unique WO code for this company
                $count = WorkOrder::query()
                    ->where('company_id', $plan->company_id)
                    ->withTrashed()
                    ->count() + 1;

                $code = 'WO-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);

                // Create the work order
                $workOrder = WorkOrder::query()->create([
                    'company_id'           => $plan->company_id,
                    'code'                 => $code,
                    'title'                => '[PM] ' . $plan->name,
                    'description'          => $plan->description,
                    'status'               => 'open',
                    'priority'             => $plan->priority,
                    'asset_id'             => $plan->assets->first()?->id ?? null,
                    'created_by_member_id' => $plan->created_by_member_id,
                    'estimated_minutes'    => $plan->estimated_minutes,
                    'opened_at'            => $now,
                ]);

                // Notify managers that a WO was auto-generated
                NotificationService::notifyPmWoGenerated($workOrder, $plan);

                // Assign the technician
                if ($plan->assigned_member_id) {
                    $workOrder->update(['assigned_member_id' => $plan->assigned_member_id]);
                    NotificationService::notifyWoAssigned($workOrder, [$plan->assigned_member_id], $plan->created_by_member_id ?? $plan->assigned_member_id);
                }

                // Copy PM tasks → WO checklist items
                foreach ($plan->tasks as $task) {
                    WorkOrderChecklistItem::create([
                        'work_order_id' => $workOrder->id,
                        'pm_task_id'    => $task->id,
                        'title'         => $task->title,
                        'is_completed'  => false,
                        'order_index'   => $task->order_index,
                    ]);
                }

                // Link WO to the PM plan
                $plan->pmWorkOrders()->create(['work_order_id' => $workOrder->id]);

                // Advance the trigger schedule
                $next = match ($trigger->interval_unit) {
                    'days'   => $now->copy()->addDays($trigger->interval_value),
                    'weeks'  => $now->copy()->addWeeks($trigger->interval_value),
                    'months' => $now->copy()->addMonths($trigger->interval_value),
                    default  => $now->copy()->addDays($trigger->interval_value),
                };

                $trigger->update([
                    'last_run_at' => $now,
                    'next_run_at' => $next,
                ]);
            });

            $generated++;
            $this->line("  ✓ PM plan [{$plan->code}] {$plan->name} → WO created");
        }

        $this->info("Done. {$generated} work order(s) generated.");

        return self::SUCCESS;
    }
}
