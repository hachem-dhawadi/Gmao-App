<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'opened_at'   => 'datetime',
        'due_at'      => 'datetime',
        'closed_at'   => 'datetime',
        'archived_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'created_by_member_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'closed_by_member_id');
    }

    public function assignedMember(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'assigned_member_id');
    }

    public function workLogs(): HasMany
    {
        return $this->hasMany(WorkLog::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(WorkOrderStatusHistory::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(WorkOrderComment::class)->with('member.user')->latest();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(WorkOrderAttachment::class)->with('member.user')->latest();
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(WorkOrderChecklistItem::class)->orderBy('order_index');
    }
}
