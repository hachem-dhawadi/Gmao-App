<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderChecklistItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'completed_by_member_id');
    }
}
