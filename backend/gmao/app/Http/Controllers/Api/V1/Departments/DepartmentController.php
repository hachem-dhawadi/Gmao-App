<?php

namespace App\Http\Controllers\Api\V1\Departments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Departments\StoreDepartmentRequest;
use App\Http\Requests\Api\V1\Departments\UpdateDepartmentRequest;
use App\Http\Resources\Api\V1\Departments\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $departments = Department::query()
            ->with(['parent', 'children', 'members'])
            ->where('company_id', $currentCompany->id)
            ->orderBy('name')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Departments retrieved successfully.',
            'data' => $this->transformPaginator($departments),
        ]);
    }

    public function show(Request $request, Department $department): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $department->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Department not found.'], 404);
        }

        $department->load(['parent', 'children', 'members']);

        return response()->json([
            'success' => true,
            'message' => 'Department retrieved successfully.',
            'data' => ['department' => DepartmentResource::make($department)->resolve()],
        ]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if (Department::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Department code already exists in this company.'], 422);
        }

        if (! empty($validated['parent_department_id'])) {
            $parentBelongs = Department::query()
                ->where('id', $validated['parent_department_id'])
                ->where('company_id', $currentCompany->id)
                ->exists();

            if (! $parentBelongs) {
                return response()->json(['success' => false, 'message' => 'The parent department does not belong to this company.'], 422);
            }
        }

        $department = Department::query()->create([
            'company_id' => $currentCompany->id,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'parent_department_id' => $validated['parent_department_id'] ?? null,
        ]);

        $department->load(['parent', 'children', 'members']);

        return response()->json([
            'success' => true,
            'message' => 'Department created successfully.',
            'data' => ['department' => DepartmentResource::make($department)->resolve()],
        ], 201);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $department->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Department not found.'], 404);
        }

        if ($validated === []) {
            return response()->json(['success' => false, 'message' => 'No fields provided for update.'], 422);
        }

        if (array_key_exists('code', $validated) && Department::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->where('id', '!=', $department->id)
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Department code already exists in this company.'], 422);
        }

        if (array_key_exists('parent_department_id', $validated) && ! empty($validated['parent_department_id'])) {
            if ((int) $validated['parent_department_id'] === $department->id) {
                return response()->json(['success' => false, 'message' => 'A department cannot be its own parent.'], 422);
            }

            $parentBelongs = Department::query()
                ->where('id', $validated['parent_department_id'])
                ->where('company_id', $currentCompany->id)
                ->exists();

            if (! $parentBelongs) {
                return response()->json(['success' => false, 'message' => 'The parent department does not belong to this company.'], 422);
            }
        }

        $department->forceFill($validated)->save();
        $department->load(['parent', 'children', 'members']);

        return response()->json([
            'success' => true,
            'message' => 'Department updated successfully.',
            'data' => ['department' => DepartmentResource::make($department)->resolve()],
        ]);
    }

    public function destroy(Request $request, Department $department): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $department->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Department not found.'], 404);
        }

        $department->children()->update(['parent_department_id' => null]);
        $department->members()->update(['department_id' => null]);
        $department->delete();

        return response()->json([
            'success' => true,
            'message' => 'Department deleted successfully.',
        ]);
    }

    /**
     * @return array{departments: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        $departments = $paginator->getCollection()
            ->map(fn (Department $d): array => DepartmentResource::make($d)->resolve())
            ->values()
            ->all();

        return [
            'departments' => $departments,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }
}
