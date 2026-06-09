<?php

namespace App\Http\Resources\Api\V1\Sites;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Site
 */
class SiteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'company_id'  => $this->company_id,
            'name'        => $this->name,
            'code'        => $this->code,
            'description' => $this->description,
            'address'     => $this->address,
            'phone'       => $this->phone,
            'timezone'    => $this->timezone,
            'is_active'   => (bool) $this->is_active,
            'geo_lat'     => $this->geo_lat,
            'geo_lng'     => $this->geo_lng,
            'created_at'  => $this->created_at?->toISOString(),
            'updated_at'  => $this->updated_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'assets_count'    => $this->assets_count ?? null,
            'members_count'   => $this->members_count ?? null,
            'warehouses_count' => $this->warehouses_count ?? null,
        ];
    }
}
