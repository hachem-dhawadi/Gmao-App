<?php

namespace App\Services;

use App\Models\PmPlan;
use App\Models\PmTrigger;
use App\Models\WorkOrder;
use App\Models\WorkOrderChecklistItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PmWorkOrderService
{
    /**
     * Generate a WO from a PM plan, link it, advance the trigger schedule.
     * Returns the created WorkOrder.
     */
    public static function generate(PmPlan $plan, ?int $actorMemberId = null): WorkOrder
    {
        $plan->loadMissing(['assets', 'tasks', 'triggers']);

        return DB::transaction(function () use ($plan, $actorMemberId) {
            $now = Carbon::now();

            $count = WorkOrder::query()
                ->where('company_id', $plan->company_id)
                ->withTrashed()
                ->count() + 1;

            $asset = $plan->assets->first();

            $workOrder = WorkOrder::create([
                'company_id'           => $plan->company_id,
                'code'                 => 'WO-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT),
                'title'                => '[PM] ' . $plan->name,
                'description'          => $plan->description,
                'priority'             => $plan->priority,
                'asset_id'             => $asset?->id,
                'site_id'              => $asset?->site_id,
                'status'               => 'open',
                'created_by_member_id' => $actorMemberId ?? $plan->created_by_member_id,
                'assigned_member_id'   => $plan->assigned_member_id,
                'team_id'              => $plan->team_id,
                'estimated_minutes'    => $plan->estimated_minutes,
                'opened_at'            => $now,
            ]);

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
            $trigger = $plan->triggers->first();
            if ($trigger) {
                $next = self::calculateNextRun($trigger, $now);
                $trigger->update([
                    'last_run_at' => $now,
                    'next_run_at' => $next,
                ]);
            }

            // Notify assigned technician
            if ($plan->assigned_member_id) {
                NotificationService::notifyWoAssigned(
                    $workOrder,
                    [$plan->assigned_member_id],
                    $actorMemberId ?? $plan->created_by_member_id,
                );
            }

            // Notify managers
            NotificationService::notifyPmWoGenerated($workOrder, $plan);

            return $workOrder;
        });
    }

    public static function calculateNextRun(PmTrigger $trigger, Carbon $from): Carbon
    {
        return match ($trigger->interval_unit) {
            'weeks'  => $from->copy()->addWeeks($trigger->interval_value),
            'months' => $from->copy()->addMonths($trigger->interval_value),
            default  => $from->copy()->addDays($trigger->interval_value),
        };
    }
}
