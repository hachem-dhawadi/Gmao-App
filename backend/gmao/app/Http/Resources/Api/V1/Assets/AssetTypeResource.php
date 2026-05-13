<?php

namespace App\Http\Resources\Api\V1\Assets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\AssetType
 */
class AssetTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'   => $this->id,
            'name' => $this->name,
            'code' => $this->code,
        ];
    }
}
