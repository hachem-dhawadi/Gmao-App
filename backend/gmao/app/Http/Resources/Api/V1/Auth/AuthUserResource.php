<?php

namespace App\Http\Resources\Api\V1\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin \App\Models\User
 */
class AuthUserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $avatarStoragePath = $this->avatar_path;
        $avatarExists = $avatarStoragePath
            ? Storage::disk('public')->exists($avatarStoragePath)
            : false;

        $avatarUrl = null;

        if ($avatarExists) {
            $avatarUrl = '/storage/' . $avatarStoragePath;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_path' => $avatarUrl,
            'avatar_storage_path' => $avatarStoragePath,
            'avatar_url' => $avatarUrl,
            'locale' => $this->locale,
            'is_active' => (bool) $this->is_active,
            'is_superadmin' => (bool) $this->is_superadmin,
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
