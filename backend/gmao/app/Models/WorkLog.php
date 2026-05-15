<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkLog extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'started_at'  => 'datetime',
        'ended_at'    => 'datetime',
        'is_billable' => 'boolean',
        'labor_cost'  => 'decimal:2',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class)->with('user');
    }
}
