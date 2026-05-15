<?php

namespace App\Http\Controllers\Api\V1\Assets;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\Assets\AssetResource;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;

class AssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));
        $search  = $request->query('search');
        $status  = $request->query('status');

        $query = Asset::query()
            ->with('assetType')
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('manufacturer', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        $assets = $query->paginate($perPage);

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

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $validated = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'code'            => ['required', 'string', 'max:100'],
            'asset_type_id'   => ['required', 'integer', 'exists:asset_types,id'],
            'status'          => ['required', 'string', 'in:active,inactive,under_maintenance,decommissioned'],
            'serial_number'   => ['nullable', 'string', 'max:255'],
            'manufacturer'    => ['nullable', 'string', 'max:255'],
            'model'           => ['nullable', 'string', 'max:255'],
            'location'        => ['nullable', 'string', 'max:255'],
            'address_label'   => ['nullable', 'string', 'max:255'],
            'notes'           => ['nullable', 'string'],
            'purchase_date'   => ['nullable', 'date'],
            'warranty_end_at' => ['nullable', 'date'],
            'installed_at'    => ['nullable', 'date'],
            'images'          => ['nullable', 'array'],
            'images.*'        => ['image', 'max:2048'],
        ]);

        if (Asset::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Asset code already exists in this company.'], 422);
        }

        $images = $this->storeImages($request);

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
            'images'          => $images,
        ]);

        $asset->load('assetType');

        return response()->json([
            'success' => true,
            'message' => 'Asset created successfully.',
            'data'    => ['asset' => AssetResource::make($asset)->resolve()],
        ], 201);
    }

    public function update(Request $request, Asset $asset): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $asset->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Asset not found.'], 404);
        }

        $validated = $request->validate([
            'name'              => ['sometimes', 'string', 'max:255'],
            'code'              => ['sometimes', 'string', 'max:100'],
            'asset_type_id'     => ['sometimes', 'integer', 'exists:asset_types,id'],
            'status'            => ['sometimes', 'string', 'in:active,inactive,under_maintenance,decommissioned'],
            'serial_number'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'manufacturer'      => ['sometimes', 'nullable', 'string', 'max:255'],
            'model'             => ['sometimes', 'nullable', 'string', 'max:255'],
            'location'          => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_label'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes'             => ['sometimes', 'nullable', 'string'],
            'purchase_date'     => ['sometimes', 'nullable', 'date'],
            'warranty_end_at'   => ['sometimes', 'nullable', 'date'],
            'installed_at'      => ['sometimes', 'nullable', 'date'],
            'existing_images'   => ['nullable', 'array'],
            'existing_images.*' => ['nullable', 'string'],
            'images'            => ['nullable', 'array'],
            'images.*'          => ['image', 'max:2048'],
        ]);

        if (array_key_exists('code', $validated) && Asset::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->where('id', '!=', $asset->id)
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Asset code already exists in this company.'], 422);
        }

        // Handle images: keep existing, delete removed, store new
        $existingUrls = $request->input('existing_images', $asset->images ?? []);
        $oldImages    = $asset->images ?? [];

        foreach ($oldImages as $url) {
            if (! in_array($url, $existingUrls)) {
                $path = $this->urlToStoragePath($url);
                if ($path) Storage::disk('public')->delete($path);
            }
        }

        $newImages   = $this->storeImages($request);
        $finalImages = array_merge($existingUrls, $newImages);

        $fillable       = [];
        $scalarFields   = [
            'name', 'code', 'asset_type_id', 'status', 'serial_number',
            'manufacturer', 'model', 'location', 'address_label', 'notes',
            'purchase_date', 'warranty_end_at', 'installed_at',
        ];
        foreach ($scalarFields as $field) {
            if (array_key_exists($field, $validated)) {
                $fillable[$field] = $validated[$field];
            }
        }
        $fillable['images'] = $finalImages;

        $asset->forceFill($fillable)->save();
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
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $asset->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Asset not found.'], 404);
        }

        $isAdmin = $currentMember?->roles()->where('code', 'admin')->exists() ?? false;
        if (! $isAdmin) {
            return response()->json(['success' => false, 'message' => 'Only administrators can delete assets.'], 403);
        }

        foreach ($asset->images ?? [] as $url) {
            $path = $this->urlToStoragePath($url);
            if ($path) Storage::disk('public')->delete($path);
        }

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Asset deleted successfully.',
        ]);
    }

    private function storeImages(Request $request): array
    {
        $urls = [];
        if (! $request->hasFile('images')) {
            return $urls;
        }
        foreach ((array) $request->file('images') as $file) {
            if (! $file || ! $file->isValid()) {
                continue;
            }
            $path   = $file->store('assets', 'public');
            $urls[] = url(Storage::url($path));
        }
        return $urls;
    }

    private function urlToStoragePath(string $url): ?string
    {
        $parsed = parse_url($url, PHP_URL_PATH);
        if (! $parsed) {
            return null;
        }
        $prefix = '/storage/';
        if (str_starts_with($parsed, $prefix)) {
            return substr($parsed, strlen($prefix));
        }
        return null;
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
