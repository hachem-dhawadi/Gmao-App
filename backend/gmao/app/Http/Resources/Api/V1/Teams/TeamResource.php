<?php

namespace App\Http\Resources\Api\V1\Teams;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'description'  => $this->description,
            'color'        => $this->color,
            'is_active'    => $this->is_active,
            'members_count'=> $this->members_count ?? null,
            'members'      => $this->relationLoaded('members')
                ? $this->members->map(fn ($m) => [
                    'id'        => $m->id,
                    'name'      => $m->user?->name ?? $m->employee_code,
                    'avatar'    => $m->user?->avatar_url ?? $m->user?->avatar_path ?? null,
                    'job_title' => $m->job_title,
                ])
                : null,
            'created_at'   => $this->created_at?->toDateTimeString(),
        ];
    }
}
