<?php

namespace App\Http\Resources\Api\V1\Members;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
    private function resolveAvatarUrl(Request $request, ?string $avatarPath): ?string
    {
        if (! $avatarPath) {
            return null;
        }

        if (! Storage::disk('public')->exists($avatarPath)) {
            return null;
        }

        $storageUrl = Storage::disk('public')->url($avatarPath);
        $storagePath = parse_url($storageUrl, PHP_URL_PATH) ?: $storageUrl;
        $normalizedPath = str_starts_with($storagePath, '/')
            ? $storagePath
            : '/' . ltrim($storagePath, '/');

        return $request->getSchemeAndHttpHost() . $normalizedPath;
    }

    public function toArray(Request $request): array
    {
        $avatarUrl = $this->resolveAvatarUrl($request, $this->user?->avatar_path ?? null);

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
                'avatar_path' => $avatarUrl,
                'avatar_url' => $avatarUrl,
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
