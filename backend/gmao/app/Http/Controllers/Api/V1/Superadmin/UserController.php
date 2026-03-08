<?php

namespace App\Http\Controllers\Api\V1\Superadmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Superadmin\StoreSuperadminUserRequest;
use App\Http\Requests\Api\V1\Superadmin\UpdateSuperadminUserRequest;
use App\Http\Resources\Api\V1\Auth\AuthUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        $query = User::query()->withCount('members')->orderByDesc('id');

        if ($request->boolean('only_trashed')) {
            $query->onlyTrashed();
        } elseif ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        $users = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Users retrieved successfully.',
            'data' => $this->transformUsersPaginator($users),
        ]);
    }

    public function store(StoreSuperadminUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
            'locale' => $validated['locale'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'is_superadmin' => $validated['is_superadmin'] ?? false,
            'two_factor_enabled' => $validated['two_factor_enabled'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => [
                'user' => AuthUserResource::make($user)->resolve(),
            ],
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount('members');

        return response()->json([
            'success' => true,
            'message' => 'User retrieved successfully.',
            'data' => [
                'user' => array_merge(
                    AuthUserResource::make($user)->resolve(),
                    [
                        'members_count' => $user->members_count,
                        'deleted_at' => $user->deleted_at,
                    ]
                ),
            ],
        ]);
    }

    public function update(UpdateSuperadminUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        if ($validated === []) {
            return response()->json([
                'success' => false,
                'message' => 'No fields provided for update.',
            ], 422);
        }

        $payload = [];

        foreach (['name', 'email', 'phone', 'locale', 'is_active', 'is_superadmin', 'two_factor_enabled'] as $field) {
            if (array_key_exists($field, $validated)) {
                $payload[$field] = $validated[$field];
            }
        }

        if (array_key_exists('password', $validated)) {
            $payload['password'] = $validated['password'];
        }

        if ($payload !== []) {
            $user->forceFill($payload)->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => [
                'user' => AuthUserResource::make($user)->resolve(),
            ],
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();

        if ($actor && $actor->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }

    /**
     * @return array{users: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformUsersPaginator(LengthAwarePaginator $paginator): array
    {
        $users = $paginator->getCollection()
            ->map(fn (User $user): array => array_merge(
                AuthUserResource::make($user)->resolve(),
                [
                    'members_count' => $user->members_count,
                    'deleted_at' => $user->deleted_at,
                ]
            ))
            ->values()
            ->all();

        return [
            'users' => $users,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }
}
