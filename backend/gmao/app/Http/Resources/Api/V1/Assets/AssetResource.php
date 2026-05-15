<?php

namespace App\Http\Resources\Api\V1\Assets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Asset
 */
class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'asset_type_id'   => $this->asset_type_id,
            'code'            => $this->code,
            'name'            => $this->name,
            'status'          => $this->status,
            'serial_number'   => $this->serial_number,
            'manufacturer'    => $this->manufacturer,
            'model'           => $this->model,
            'location'        => $this->location,
            'address_label'   => $this->address_label,
            'notes'           => $this->notes,
            'purchase_date'   => $this->purchase_date?->toDateString(),
            'warranty_end_at' => $this->warranty_end_at?->toDateString(),
            'installed_at'    => $this->installed_at?->toISOString(),
            'created_at'      => $this->created_at?->toISOString(),
            'updated_at'      => $this->updated_at?->toISOString(),
            'images'          => $this->images ?? [],
            'asset_type'      => $this->relationLoaded('assetType') && $this->assetType
                ? ['id' => $this->assetType->id, 'name' => $this->assetType->name, 'code' => $this->assetType->code]
                : null,
        ];
    }
}
