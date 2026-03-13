<?php

namespace App\Http\Controllers\Api\V1\Superadmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Superadmin\StoreSuperadminCompanyRequest;
use App\Http\Requests\Api\V1\Superadmin\UpdateSuperadminCompanyRequest;
use App\Models\Company;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        $query = Company::query()->withCount('members')->orderByDesc('id');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $companies = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Companies retrieved successfully.',
            'data' => $this->transformCompaniesPaginator($companies),
        ]);
    }

    public function store(StoreSuperadminCompanyRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $isActive = (bool) ($validated['is_active'] ?? false);

        $logoPath = $request->hasFile('logo')
            ? $request->file('logo')->store('company-logos', 'public')
            : null;

        $company = Company::query()->create([
            'name' => $validated['name'],
            'legal_name' => $validated['legal_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address_line1' => $validated['address_line1'] ?? null,
            'address_line2' => $validated['address_line2'] ?? null,
            'city' => $validated['city'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'country' => $validated['country'] ?? null,
            'logo_path' => $logoPath,
            'settings_json' => $validated['settings_json'] ?? null,
            'timezone' => $validated['timezone'],
            'is_active' => $isActive,
            'approval_status' => $validated['approval_status'] ?? ($isActive ? 'approved' : 'pending'),
        ]);

        $company->loadCount('members');

        return response()->json([
            'success' => true,
            'message' => 'Company created successfully.',
            'data' => [
                'company' => $this->transformCompany($company),
            ],
        ], 201);
    }

    public function show(Company $company): JsonResponse
    {
        $company->loadCount('members');

        return response()->json([
            'success' => true,
            'message' => 'Company retrieved successfully.',
            'data' => [
                'company' => $this->transformCompany($company),
            ],
        ]);
    }

    public function update(UpdateSuperadminCompanyRequest $request, Company $company): JsonResponse
    {
        $validated = $request->validated();

        if ($validated === [] && ! $request->hasFile('logo')) {
            return response()->json([
                'success' => false,
                'message' => 'No fields provided for update.',
            ], 422);
        }

        $payload = [];
        foreach (['name', 'legal_name', 'phone', 'email', 'address_line1', 'address_line2', 'city', 'postal_code', 'country', 'settings_json', 'timezone', 'is_active', 'approval_status'] as $field) {
            if (array_key_exists($field, $validated)) {
                $payload[$field] = $validated[$field];
            }
        }

        if ($request->hasFile('logo')) {
            $newLogoPath = $request->file('logo')->store('company-logos', 'public');

            if ($company->logo_path) {
                Storage::disk('public')->delete($company->logo_path);
            }

            $payload['logo_path'] = $newLogoPath;
        }

        if ($payload !== []) {
            $company->forceFill($payload)->save();
        }

        $company->loadCount('members');

        return response()->json([
            'success' => true,
            'message' => 'Company updated successfully.',
            'data' => [
                'company' => $this->transformCompany($company),
            ],
        ]);
    }

    public function destroy(Company $company): JsonResponse
    {
        try {
            $company->delete();
        } catch (QueryException $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Company cannot be deleted because related records exist. Deactivate it instead.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Company deleted successfully.',
        ]);
    }

    /**
     * @return array{companies: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformCompaniesPaginator(LengthAwarePaginator $paginator): array
    {
        $companies = $paginator->getCollection()
            ->map(fn (Company $company): array => $this->transformCompany($company))
            ->values()
            ->all();

        return [
            'companies' => $companies,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformCompany(Company $company): array
    {
        return [
            'id' => $company->id,
            'name' => $company->name,
            'legal_name' => $company->legal_name,
            'phone' => $company->phone,
            'email' => $company->email,
            'address_line1' => $company->address_line1,
            'address_line2' => $company->address_line2,
            'city' => $company->city,
            'postal_code' => $company->postal_code,
            'country' => $company->country,
            'logo_path' => $company->logo_path,
            'logo_url' => $this->resolveLogoUrl($company->logo_path),
            'timezone' => $company->timezone,
            'is_active' => (bool) $company->is_active,
            'approval_status' => $company->approval_status,
            'members_count' => $company->members_count,
            'created_at' => $company->created_at,
            'updated_at' => $company->updated_at,
        ];
    }

    private function resolveLogoUrl(?string $logoPath): ?string
    {
        if (! $logoPath) {
            return null;
        }

        return url(Storage::disk('public')->url($logoPath));
    }
}
