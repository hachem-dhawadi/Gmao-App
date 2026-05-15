<?php

namespace App\Http\Controllers\Api\V1\Roles;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $roles = Role::query()
            ->with('permissions')
            ->where('company_id', $currentCompany->id)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Role $role) => [
                'id'          => $role->id,
                'code'        => $role->code,
                'label'       => $role->label,
                'description' => $role->description,
                'sort_order'  => $role->sort_order,
                'is_system'   => $role->is_system,
                'permissions' => $role->permissions->map(fn ($p) => [
                    'id'    => $p->id,
                    'code'  => $p->code,
                    'label' => $p->label,
                ])->values()->all(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Roles retrieved successfully.',
            'data'    => ['roles' => $roles],
        ]);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $role->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Role not found.'], 404);
        }

        $validated = $request->validate([
            'label'         => ['sometimes', 'string', 'max:255'],
            'description'   => ['nullable', 'string', 'max:500'],
            'permissions'   => ['sometimes', 'array'],
            'permissions.*' => ['string', 'exists:permissions,code'],
        ]);

        if (isset($validated['label'])) {
            $role->label = $validated['label'];
        }

        if (array_key_exists('description', $validated)) {
            $role->description = $validated['description'];
        }

        $role->save();

        if (isset($validated['permissions'])) {
            $permissionIds = Permission::query()
                ->whereIn('code', $validated['permissions'])
                ->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        $role->load('permissions');

        return response()->json([
            'success' => true,
            'message' => 'Role updated successfully.',
            'data'    => [
                'role' => [
                    'id'          => $role->id,
                    'code'        => $role->code,
                    'label'       => $role->label,
                    'description' => $role->description,
                    'sort_order'  => $role->sort_order,
                    'is_system'   => $role->is_system,
                    'permissions' => $role->permissions->map(fn ($p) => [
                        'id'    => $p->id,
                        'code'  => $p->code,
                        'label' => $p->label,
                    ])->values()->all(),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $validated = $request->validate([
            'label'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:500'],
            'permissions'    => ['required', 'array', 'min:1'],
            'permissions.*'  => ['string', 'exists:permissions,code'],
        ]);

        $code = Str::slug($validated['label'], '_');

        if (Role::query()->where('company_id', $currentCompany->id)->where('code', $code)->exists()) {
            return response()->json(['success' => false, 'message' => 'A role with this name already exists.'], 422);
        }

        $maxOrder = Role::query()->where('company_id', $currentCompany->id)->max('sort_order') ?? 0;

        $role = Role::query()->create([
            'company_id'  => $currentCompany->id,
            'code'        => $code,
            'label'       => $validated['label'],
            'description' => $validated['description'] ?? null,
            'sort_order'  => $maxOrder + 1,
            'is_system'   => false,
        ]);

        $permissionIds = Permission::query()
            ->whereIn('code', $validated['permissions'])
            ->pluck('id');

        $role->permissions()->sync($permissionIds);
        $role->load('permissions');

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully.',
            'data'    => [
                'role' => [
                    'id'          => $role->id,
                    'code'        => $role->code,
                    'label'       => $role->label,
                    'description' => $role->description,
                    'sort_order'  => $role->sort_order,
                    'is_system'   => $role->is_system,
                    'permissions' => $role->permissions->map(fn ($p) => [
                        'id'    => $p->id,
                        'code'  => $p->code,
                        'label' => $p->label,
                    ])->values()->all(),
                ],
            ],
        ], 201);
    }
}
