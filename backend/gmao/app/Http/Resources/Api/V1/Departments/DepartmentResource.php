<?php

namespace App\Http\Resources\Api\V1\Departments;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Department
 */
class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'parent_department_id' => $this->parent_department_id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'parent' => $this->relationLoaded('parent') && $this->parent ? [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
                'code' => $this->parent->code,
            ] : null,
            'children_count' => $this->when(
                $this->relationLoaded('children'),
                fn () => $this->children->count()
            ),
            'members_count' => $this->when(
                $this->relationLoaded('members'),
                fn () => $this->members->count()
            ),
        ];
    }
}
