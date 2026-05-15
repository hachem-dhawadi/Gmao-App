<?php

namespace App\Http\Resources\Api\V1\WorkOrders;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin \App\Models\WorkOrder
 */
class WorkOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'company_id'           => $this->company_id,
            'code'                 => $this->code,
            'title'                => $this->title,
            'description'          => $this->description,
            'status'               => $this->status,
            'priority'             => $this->priority,
            'asset_id'             => $this->asset_id,
            'created_by_member_id' => $this->created_by_member_id,
            'closed_by_member_id'  => $this->closed_by_member_id,
            'opened_at'            => $this->opened_at?->toISOString(),
            'due_at'               => $this->due_at?->toISOString(),
            'closed_at'            => $this->closed_at?->toISOString(),
            'estimated_minutes'    => $this->estimated_minutes,
            'created_at'           => $this->created_at?->toISOString(),
            'updated_at'           => $this->updated_at?->toISOString(),
            'asset'                => $this->relationLoaded('asset') && $this->asset
                ? ['id' => $this->asset->id, 'code' => $this->asset->code, 'name' => $this->asset->name]
                : null,
            'created_by'           => $this->relationLoaded('createdBy') && $this->createdBy
                ? ['id' => $this->createdBy->id, 'name' => $this->createdBy->user?->name]
                : null,
            'assigned_members'     => $this->relationLoaded('assignedMembers')
                ? $this->assignedMembers->map(fn ($m) => [
                    'id'          => $m->id,
                    'name'        => $m->user?->name,
                    'assigned_at' => $m->pivot->assigned_at,
                ])->values()->all()
                : [],
            'status_history'       => $this->relationLoaded('statusHistory')
                ? $this->statusHistory->map(fn ($h) => [
                    'id'                   => $h->id,
                    'old_status'           => $h->old_status,
                    'new_status'           => $h->new_status,
                    'note'                 => $h->note,
                    'changed_at'           => $h->changed_at?->toISOString(),
                    'changed_by'           => $h->changedBy?->user?->name,
                ])->values()->all()
                : null,
            'comments'             => $this->relationLoaded('comments')
                ? $this->comments->map(fn ($c) => [
                    'id'         => $c->id,
                    'body'       => $c->body,
                    'author'     => $c->member?->user?->name ?? 'Unknown',
                    'member_id'  => $c->member_id,
                    'created_at' => $c->created_at?->toISOString(),
                ])->values()->all()
                : null,
            'attachments'          => $this->relationLoaded('attachments')
                ? $this->attachments->map(fn ($a) => [
                    'id'            => $a->id,
                    'original_name' => $a->original_name,
                    'mime_type'     => $a->mime_type,
                    'size_bytes'    => $a->size_bytes,
                    'url'           => url(Storage::url($a->stored_path)),
                    'author'        => $a->member?->user?->name ?? 'Unknown',
                    'created_at'    => $a->created_at?->toISOString(),
                ])->values()->all()
                : null,
            'work_logs'            => $this->relationLoaded('workLogs')
                ? $this->workLogs->map(fn ($l) => [
                    'id'            => $l->id,
                    'member_id'     => $l->member_id,
                    'author'        => $l->member?->user?->name ?? 'Unknown',
                    'labor_minutes' => $l->labor_minutes,
                    'labor_cost'    => $l->labor_cost !== null ? (float) $l->labor_cost : null,
                    'notes'         => $l->notes,
                    'created_at'    => $l->created_at?->toISOString(),
                ])->values()->all()
                : null,
            'work_logs_summary'    => $this->relationLoaded('workLogs')
                ? [
                    'total_minutes' => (int) $this->workLogs->sum('labor_minutes'),
                    'total_cost'    => (float) $this->workLogs->sum('labor_cost'),
                ]
                : null,
        ];
    }
}
