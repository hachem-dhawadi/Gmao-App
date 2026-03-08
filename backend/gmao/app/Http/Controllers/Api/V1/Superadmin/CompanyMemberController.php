<?php

namespace App\Http\Controllers\Api\V1\Superadmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Superadmin\StoreSuperadminCompanyMemberRequest;
use App\Http\Requests\Api\V1\Superadmin\UpdateSuperadminCompanyMemberRequest;
use App\Http\Resources\Api\V1\Members\MemberResource;
use App\Models\Company;
use App\Models\Member;
use App\Models\Role;
use App\Models\User;
use App\Notifications\EmployeePasswordSetupNotification;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CompanyMemberController extends Controller
{
    public function index(Request $request, Company $company): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        $query = Member::query()
            ->with(['user', 'roles'])
            ->where('company_id', $company->id)
            ->orderByDesc('id');

        if ($request->boolean('only_trashed')) {
            $query->onlyTrashed();
        } elseif ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        $members = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Company members retrieved successfully.',
            'data' => $this->transformMembersPaginator($members),
        ]);
    }

    public function store(StoreSuperadminCompanyMemberRequest $request, Company $company): JsonResponse
    {
        $validated = $request->validated();

        if (! empty($validated['department_id']) && ! $this->departmentBelongsToCompany((int) $validated['department_id'], $company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'The selected department does not belong to the target company.',
            ], 422);
        }

        $roles = $this->resolveCompanyRoles($company->id, collect($validated['roles'])->values());
        if (! $roles) {
            return response()->json([
                'success' => false,
                'message' => 'One or more roles are invalid for the target company.',
            ], 422);
        }

        $user = $this->resolveOrCreateUser($validated);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if (Member::query()->where('company_id', $company->id)->where('user_id', $user->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This user is already assigned to the target company.',
            ], 422);
        }

        if (Member::query()->where('company_id', $company->id)->where('employee_code', $validated['employee_code'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Employee code already exists in this company.',
            ], 422);
        }

        $member = DB::transaction(function () use ($validated, $company, $roles, $user): Member {
            $member = Member::query()->create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'department_id' => $validated['department_id'] ?? null,
                'employee_code' => $validated['employee_code'],
                'job_title' => $validated['job_title'] ?? null,
                'status' => $validated['status'] ?? 'active',
            ]);

            $member->roles()->sync($roles->pluck('id')->all());
            $this->sendPasswordSetup($user);

            return $member->load(['user', 'roles']);
        });

        return response()->json([
            'success' => true,
            'message' => 'User assigned to company successfully.',
            'data' => [
                'member' => MemberResource::make($member)->resolve(),
            ],
        ], 201);
    }

    public function show(Company $company, Member $member): JsonResponse
    {
        if ((int) $member->company_id !== (int) $company->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found for the target company.',
            ], 404);
        }

        $member->load(['user', 'roles']);

        return response()->json([
            'success' => true,
            'message' => 'Company member retrieved successfully.',
            'data' => [
                'member' => MemberResource::make($member)->resolve(),
            ],
        ]);
    }

    public function update(UpdateSuperadminCompanyMemberRequest $request, Company $company, Member $member): JsonResponse
    {
        if ((int) $member->company_id !== (int) $company->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found for the target company.',
            ], 404);
        }

        $validated = $request->validated();

        if ($validated === []) {
            return response()->json([
                'success' => false,
                'message' => 'No fields provided for update.',
            ], 422);
        }

        if (array_key_exists('department_id', $validated)
            && ! empty($validated['department_id'])
            && ! $this->departmentBelongsToCompany((int) $validated['department_id'], $company->id)) {
            return response()->json([
                'success' => false,
                'message' => 'The selected department does not belong to the target company.',
            ], 422);
        }

        if (array_key_exists('employee_code', $validated)
            && Member::query()
                ->where('company_id', $company->id)
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
            $roles = $this->resolveCompanyRoles($company->id, collect($validated['roles'])->values());
            if (! $roles) {
                return response()->json([
                    'success' => false,
                    'message' => 'One or more roles are invalid for the target company.',
                ], 422);
            }
        }

        $updatedMember = DB::transaction(function () use ($validated, $member, $user, $roles): Member {
            $userPayload = [];
            foreach (['name', 'email', 'phone', 'locale'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $userPayload[$field] = $validated[$field];
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
            'message' => 'Company member updated successfully.',
            'data' => [
                'member' => MemberResource::make($updatedMember)->resolve(),
            ],
        ]);
    }

    public function destroy(Company $company, Member $member): JsonResponse
    {
        if ((int) $member->company_id !== (int) $company->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found for the target company.',
            ], 404);
        }

        $member->roles()->detach();
        $member->delete();

        return response()->json([
            'success' => true,
            'message' => 'Company member removed successfully.',
        ]);
    }

    private function departmentBelongsToCompany(int $departmentId, int $companyId): bool
    {
        return DB::table('departments')
            ->where('id', $departmentId)
            ->where('company_id', $companyId)
            ->exists();
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

    private function resolveOrCreateUser(array $validated): User|JsonResponse
    {
        if (! empty($validated['user_id'])) {
            $user = User::query()->find((int) $validated['user_id']);
            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Provided user_id does not exist.',
                ], 422);
            }

            return $user;
        }

        $email = $validated['email'];
        $phone = $validated['phone'];

        $userByEmail = User::query()->where('email', $email)->first();
        $userByPhone = User::query()->where('phone', $phone)->first();

        if ($userByPhone && (! $userByEmail || $userByPhone->id !== $userByEmail->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Phone already exists.',
            ], 422);
        }

        if ($userByEmail) {
            $userByEmail->forceFill([
                'name' => $validated['name'] ?? $userByEmail->name,
                'phone' => $phone,
                'locale' => $validated['locale'] ?? $userByEmail->locale,
            ])->save();

            return $userByEmail;
        }

        return User::query()->create([
            'name' => $validated['name'],
            'email' => $email,
            'phone' => $phone,
            'password' => $validated['password'] ?? Str::random(16),
            'locale' => $validated['locale'] ?? null,
            'is_active' => true,
            'is_superadmin' => false,
            'two_factor_enabled' => false,
        ]);
    }

    private function sendPasswordSetup(User $user): void
    {
        $plainToken = Str::random(64);

        DB::table('password_reset_tokens')
            ->where('user_id', $user->id)
            ->delete();

        DB::table('password_reset_tokens')->insert([
            'user_id' => $user->id,
            'email' => $user->email,
            'token_hash' => hash('sha256', $plainToken),
            'created_at' => now(),
        ]);

        try {
            $user->notify(new EmployeePasswordSetupNotification($plainToken, $user->email));
        } catch (Throwable $exception) {
            Log::warning('Employee setup email could not be sent.', [
                'email' => $user->email,
                'error' => $exception->getMessage(),
            ]);
        }
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
