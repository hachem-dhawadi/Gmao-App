<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderStatusHistory extends Model
{
    protected $table = 'work_order_status_history';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'changed_by_member_id');
    }
}
