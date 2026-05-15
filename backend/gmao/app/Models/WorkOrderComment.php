<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderComment extends Model
{
    protected $guarded = [];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class)->with('user');
    }
}
