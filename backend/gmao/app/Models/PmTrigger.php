<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PmTrigger extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'next_run_at' => 'datetime',
        'last_run_at' => 'datetime',
    ];

    public function pmPlan(): BelongsTo
    {
        return $this->belongsTo(PmPlan::class);
    }
}
