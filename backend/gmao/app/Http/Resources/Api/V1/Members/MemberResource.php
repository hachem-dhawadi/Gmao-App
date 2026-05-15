<?php

namespace App\Http\Resources\Api\V1\Members;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Member
 */
class MemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'user_id' => $this->user_id,
            'department_id' => $this->department_id,
            'employee_code' => $this->employee_code,
            'job_title' => $this->job_title,
            'status' => $this->status,
            'user' => $this->relationLoaded('user') && $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
                'last_login_at' => $this->user->last_login_at?->toISOString(),
            ] : null,
            'roles' => $this->relationLoaded('roles')
                ? $this->roles->map(fn ($role) => [
                    'id' => $role->id,
                    'code' => $role->code,
                    'label' => $role->label,
                ])->values()->all()
                : [],
        ];
    }
}
