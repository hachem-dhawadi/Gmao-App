<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PmWorkOrder extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $guarded = [];

    public function pmPlan(): BelongsTo
    {
        return $this->belongsTo(PmPlan::class);
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
