<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PmTask extends Model
{
    protected $guarded = [];

    public function pmPlan(): BelongsTo
    {
        return $this->belongsTo(PmPlan::class);
    }
}
