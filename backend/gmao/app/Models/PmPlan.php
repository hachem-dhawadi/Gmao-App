<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PmPlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'created_by_member_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'assigned_member_id');
    }

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'pm_plan_assets');
    }

    public function triggers(): HasMany
    {
        return $this->hasMany(PmTrigger::class);
    }

    public function pmWorkOrders(): HasMany
    {
        return $this->hasMany(PmWorkOrder::class);
    }
}
