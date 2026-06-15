<?php

namespace App\Services;

use App\Models\WorkOrderActivity;

class WorkOrderActivityService
{
    public static function log(
        int $workOrderId,
        string $type,
        ?int $actorMemberId,
        array $meta = [],
    ): void {
        WorkOrderActivity::create([
            'work_order_id'   => $workOrderId,
            'actor_member_id' => $actorMemberId,
            'type'            => $type,
            'meta'            => $meta ?: null,
            'created_at'      => now(),
        ]);
    }
}
