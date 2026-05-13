<?php

namespace App\Http\Controllers\Api\V1\Roles;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
