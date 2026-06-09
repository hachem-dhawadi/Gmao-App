<?php

namespace App\Http\Controllers\Api\V1\Sites;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Sites\StoreSiteRequest;
use App\Http\Requests\Api\V1\Sites\UpdateSiteRequest;
use App\Http\Resources\Api\V1\Sites\SiteResource;
use App\Models\Site;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class SiteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        $sites = Site::query()
            ->withCount(['assets', 'members', 'warehouses'])
            ->where('company_id', $currentCompany->id)
            ->orderBy('name')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Sites retrieved successfully.',
            'data'    => $this->transformPaginator($sites),
        ]);
    }

    public function all(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $sites = Site::query()
            ->where('company_id', $currentCompany->id)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json([
            'success' => true,
            'message' => 'Sites retrieved successfully.',
            'data'    => ['sites' => $sites->toArray()],
        ]);
    }

    public function show(Request $request, Site $site): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $site->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Site not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Site retrieved successfully.',
            'data'    => ['site' => SiteResource::make($site)->resolve()],
        ]);
    }

    public function store(StoreSiteRequest $request): JsonResponse
    {
        $validated      = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if (Site::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Site code already exists in this company.'], 422);
        }

        $site = Site::query()->create([
            'company_id'  => $currentCompany->id,
            'name'        => $validated['name'],
            'code'        => $validated['code'],
            'description' => $validated['description'] ?? null,
            'address'     => $validated['address'] ?? null,
            'phone'       => $validated['phone'] ?? null,
            'timezone'    => $validated['timezone'] ?? 'UTC',
            'is_active'   => $validated['is_active'] ?? true,
            'geo_lat'     => $validated['geo_lat'] ?? null,
            'geo_lng'     => $validated['geo_lng'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Site created successfully.',
            'data'    => ['site' => SiteResource::make($site)->resolve()],
        ], 201);
    }

    public function update(UpdateSiteRequest $request, Site $site): JsonResponse
    {
        $validated      = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $site->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Site not found.'], 404);
        }

        if ($validated === []) {
            return response()->json(['success' => false, 'message' => 'No fields provided for update.'], 422);
        }

        if (array_key_exists('code', $validated) && Site::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->where('id', '!=', $site->id)
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Site code already exists in this company.'], 422);
        }

        $site->forceFill($validated)->save();

        return response()->json([
            'success' => true,
            'message' => 'Site updated successfully.',
            'data'    => ['site' => SiteResource::make($site)->resolve()],
        ]);
    }

    public function destroy(Request $request, Site $site): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $site->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Site not found.'], 404);
        }

        $site->delete();

        return response()->json([
            'success' => true,
            'message' => 'Site deleted successfully.',
        ]);
    }

    /**
     * @return array{sites: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        $sites = $paginator->getCollection()
            ->map(fn (Site $s): array => SiteResource::make($s)->resolve())
            ->values()
            ->all();

        return [
            'sites'      => $sites,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ];
    }
}
