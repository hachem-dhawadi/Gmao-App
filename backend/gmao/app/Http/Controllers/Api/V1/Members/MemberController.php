<?php

namespace App\Http\Controllers\Api\V1\Members;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Members\StoreMemberRequest;
use App\Http\Requests\Api\V1\Members\UpdateMemberRequest;
use App\Http\Resources\Api\V1\Members\MemberResource;
use App\Models\Member;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class MemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json([
                'success' => false,
                'message' => 'Company context is missing.',
            ], 400);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $members = Member::query()
            ->with(['user', 'roles'])
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Members retrieved successfully.',
            'data' => $this->transformMembersPaginator($members),
        ]);
    }

    public function show(Request $request, Member $member): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json([
                'success' => false,
                'message' => 'Company context is missing.',
            ], 400);
        }

        if ((int) $member->company_id !== (int) $currentCompany->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found for the active company.',
            ], 404);
        }

        $member->load(['user', 'roles']);

        return response()->json([
            'success' => true,
            'message' => 'Member retrieved successfully.',
            'data' => [
                'member' => MemberResource::make($member)->resolve(),
            ],
        ]);
    }

    public function store(StoreMemberRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');
        $avatarPath = $request->hasFile('avatar')
            ? $request->file('avatar')?->store('avatars', 'public')
            : null;

        if (! $currentCompany) {
            return response()->json([
                'success' => false,
                'message' => 'Company context is missing.',
            ], 400);
        }

        if (! empty($validated['department_id'])) {
            $departmentBelongsToCompany = DB::table('departments')
                ->where('id', (int) $validated['department_id'])
                ->where('company_id', $currentCompany->id)
                ->exists();

            if (! $departmentBelongsToCompany) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected department does not belong to the active company.',
                ], 422);
            }
        }

        $userByPhone = User::query()->where('phone', $validated['phone'])->first();
        $userByEmail = User::query()->where('email', $validated['email'])->first();

        if ($userByPhone && (! $userByEmail || $userByPhone->id !== $userByEmail->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Phone already exists.',
            ], 422);
        }

        $existingUser = $userByEmail;

        if ($existingUser && Member::query()
            ->where('company_id', $currentCompany->id)
            ->where('user_id', $existingUser->id)
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Member already exists in this company for the provided user.',
            ], 422);
        }

        if (Member::query()
            ->where('company_id', $currentCompany->id)
            ->where('employee_code', $validated['employee_code'])
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Employee code already exists in this company.',
            ], 422);
        }

        $roles = $this->resolveCompanyRoles($currentCompany->id, collect($validated['roles'])->values());
        if (! $roles) {
            return response()->json([
                'success' => false,
                'message' => 'One or more roles are invalid for the active company.',
            ], 422);
        }

        $member = DB::transaction(function () use ($validated, $currentCompany, $roles, $existingUser, $avatarPath): Member {
            $user = $existingUser;

            if (! $user) {
                $user = User::query()->create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'],
                    'avatar_path' => $avatarPath,
                    'password' => Hash::make($validated['password']),
                    'locale' => $validated['locale'] ?? null,
                    'is_active' => true,
                    'is_superadmin' => false,
                ]);
            } else {
                $userPayload = [
                    'name' => $validated['name'],
                    'phone' => $validated['phone'],
                ];

                if (! empty($validated['locale'])) {
                    $userPayload['locale'] = $validated['locale'];
                }

                if (! empty($validated['password'])) {
                    $userPayload['password'] = Hash::make($validated['password']);
                }

                if ($avatarPath) {
                    if ($user->avatar_path) {
                        Storage::disk('public')->delete($user->avatar_path);
                    }

                    $userPayload['avatar_path'] = $avatarPath;
                }

                $user->forceFill($userPayload)->save();
            }

            $member = Member::query()->create([
                'company_id' => $currentCompany->id,
                'user_id' => $user->id,
                'department_id' => $validated['department_id'] ?? null,
                'employee_code' => $validated['employee_code'],
                'job_title' => $validated['job_title'] ?? null,
                'status' => 'active',
            ]);

            $member->roles()->sync($roles->pluck('id')->all());

            return $member->load(['user', 'roles']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Member created successfully. Password setup has been triggered.',
            'data' => [
                'member' => MemberResource::make($member)->resolve(),
            ],
        ], 201);
    }

    public function update(UpdateMemberRequest $request, Member $member): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json([
                'success' => false,
                'message' => 'Company context is missing.',
            ], 400);
        }

        if ((int) $member->company_id !== (int) $currentCompany->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found for the active company.',
            ], 404);
        }

        if (
            $validated === []
            && ! $request->hasFile('avatar')
            && ! $request->boolean('remove_avatar')
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No fields provided for update.',
            ], 422);
        }

        if (array_key_exists('department_id', $validated) && ! empty($validated['department_id'])) {
            $departmentBelongsToCompany = DB::table('departments')
                ->where('id', (int) $validated['department_id'])
                ->where('company_id', $currentCompany->id)
                ->exists();

            if (! $departmentBelongsToCompany) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected department does not belong to the active company.',
                ], 422);
            }
        }

        if (array_key_exists('employee_code', $validated) && Member::query()
            ->where('company_id', $currentCompany->id)
            ->where('employee_code', $validated['employee_code'])
            ->where('id', '!=', $member->id)
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Employee code already exists in this company.',
            ], 422);
        }

        $user = $member->user;

        if (array_key_exists('email', $validated)
            && User::query()->where('email', $validated['email'])->where('id', '!=', $user->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Email already exists.',
            ], 422);
        }

        if (array_key_exists('phone', $validated)
            && User::query()->where('phone', $validated['phone'])->where('id', '!=', $user->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Phone already exists.',
            ], 422);
        }

        $roles = null;
        if (array_key_exists('roles', $validated)) {
            $roles = $this->resolveCompanyRoles($currentCompany->id, collect($validated['roles'])->values());
            if (! $roles) {
                return response()->json([
                    'success' => false,
                    'message' => 'One or more roles are invalid for the active company.',
                ], 422);
            }
        }

        $updatedMember = DB::transaction(function () use ($validated, $member, $user, $roles, $request): Member {
            $userPayload = [];
            foreach (['name', 'email', 'phone'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $userPayload[$field] = $validated[$field];
                }
            }

            if ($request->boolean('remove_avatar') && $user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
                $userPayload['avatar_path'] = null;
            }

            if ($request->hasFile('avatar')) {
                $newAvatarPath = $request->file('avatar')?->store('avatars', 'public');

                if ($newAvatarPath) {
                    if ($user->avatar_path) {
                        Storage::disk('public')->delete($user->avatar_path);
                    }

                    $userPayload['avatar_path'] = $newAvatarPath;
                }
            }

            if ($userPayload !== []) {
                $user->forceFill($userPayload)->save();
            }

            $memberPayload = [];
            foreach (['department_id', 'employee_code', 'job_title', 'status'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $memberPayload[$field] = $validated[$field];
                }
            }

            if ($memberPayload !== []) {
                $member->forceFill($memberPayload)->save();
            }

            if ($roles) {
                $member->roles()->sync($roles->pluck('id')->all());
            }

            return $member->load(['user', 'roles']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Member updated successfully.',
            'data' => [
                'member' => MemberResource::make($updatedMember)->resolve(),
            ],
        ]);
    }

    public function destroy(Request $request, Member $member): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json([
                'success' => false,
                'message' => 'Company context is missing.',
            ], 400);
        }

        if ((int) $member->company_id !== (int) $currentCompany->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found for the active company.',
            ], 404);
        }

        $member->roles()->detach();
        $member->delete();

        return response()->json([
            'success' => true,
            'message' => 'Member deleted successfully.',
        ]);
    }

    private function resolveCompanyRoles(int $companyId, Collection $roleInputs): ?EloquentCollection
    {
        if ($roleInputs->isEmpty()) {
            return null;
        }

        $roleIds = $roleInputs->filter(fn ($value) => is_numeric($value))->map(fn ($value) => (int) $value)->values();
        $roleCodes = $roleInputs->filter(fn ($value) => is_string($value))->map(fn ($value) => trim($value))->filter()->values();

        $roles = Role::query()
            ->where('company_id', $companyId)
            ->where(function ($query) use ($roleIds, $roleCodes): void {
                if ($roleIds->isNotEmpty()) {
                    $query->orWhereIn('id', $roleIds->all());
                }

                if ($roleCodes->isNotEmpty()) {
                    $query->orWhereIn('code', $roleCodes->all());
                }
            })
            ->get();

        return $roles->count() === $roleInputs->count() ? $roles : null;
    }

    /**
     * @return array{members: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformMembersPaginator(LengthAwarePaginator $paginator): array
    {
        $members = $paginator->getCollection()
            ->map(fn (Member $member): array => MemberResource::make($member)->resolve())
            ->values()
            ->all();

        return [
            'members' => $members,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }
}
