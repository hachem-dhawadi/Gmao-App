<?php

namespace App\Http\Controllers\Api\V1\Assets;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\Assets\AssetTypeResource;
use App\Models\AssetType;
use Illuminate\Http\JsonResponse;

class AssetTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $types = AssetType::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'Asset types retrieved successfully.',
            'data'    => ['asset_types' => AssetTypeResource::collection($types)->resolve()],
        ]);
    }
}
