<?php

namespace App\Http\Controllers\Api\V1\Assets;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Assets\StoreAssetRequest;
use App\Http\Requests\Api\V1\Assets\UpdateAssetRequest;
use App\Http\Resources\Api\V1\Assets\AssetResource;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class AssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $assets = Asset::query()
            ->with('assetType')
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Assets retrieved successfully.',
            'data'    => $this->transformPaginator($assets),
        ]);
    }

    public function show(Request $request, Asset $asset): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $asset->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Asset not found.'], 404);
        }

        $asset->load('assetType');

        return response()->json([
            'success' => true,
            'message' => 'Asset retrieved successfully.',
            'data'    => ['asset' => AssetResource::make($asset)->resolve()],
        ]);
    }

    public function store(StoreAssetRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if (Asset::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Asset code already exists in this company.'], 422);
        }

        $asset = Asset::query()->create([
            'company_id'      => $currentCompany->id,
            'asset_type_id'   => $validated['asset_type_id'],
            'code'            => $validated['code'],
            'name'            => $validated['name'],
            'status'          => $validated['status'],
            'serial_number'   => $validated['serial_number'] ?? null,
            'manufacturer'    => $validated['manufacturer'] ?? null,
            'model'           => $validated['model'] ?? null,
            'location'        => $validated['location'] ?? null,
            'address_label'   => $validated['address_label'] ?? null,
            'notes'           => $validated['notes'] ?? null,
            'purchase_date'   => $validated['purchase_date'] ?? null,
            'warranty_end_at' => $validated['warranty_end_at'] ?? null,
            'installed_at'    => $validated['installed_at'] ?? null,
        ]);

        $asset->load('assetType');

        return response()->json([
            'success' => true,
            'message' => 'Asset created successfully.',
            'data'    => ['asset' => AssetResource::make($asset)->resolve()],
        ], 201);
    }

    public function update(UpdateAssetRequest $request, Asset $asset): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $asset->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Asset not found.'], 404);
        }

        if ($validated === []) {
            return response()->json(['success' => false, 'message' => 'No fields provided for update.'], 422);
        }

        if (array_key_exists('code', $validated) && Asset::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->where('id', '!=', $asset->id)
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Asset code already exists in this company.'], 422);
        }

        $asset->forceFill($validated)->save();
        $asset->load('assetType');

        return response()->json([
            'success' => true,
            'message' => 'Asset updated successfully.',
            'data'    => ['asset' => AssetResource::make($asset)->resolve()],
        ]);
    }

    public function destroy(Request $request, Asset $asset): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $asset->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Asset not found.'], 404);
        }

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Asset deleted successfully.',
        ]);
    }

    /**
     * @return array{assets: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        $assets = $paginator->getCollection()
            ->map(fn (Asset $a): array => AssetResource::make($a)->resolve())
            ->values()
            ->all();

        return [
            'assets'     => $assets,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ];
    }
}
