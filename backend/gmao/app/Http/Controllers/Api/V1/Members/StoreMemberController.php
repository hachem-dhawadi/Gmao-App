<?php

namespace App\Http\Controllers\Api\V1\Members;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Members\StoreMemberRequest;
use App\Http\Resources\Api\V1\Members\MemberResource;
use App\Models\Member;
use App\Models\Role;
use App\Models\User;
use App\Notifications\EmployeePasswordSetupNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class StoreMemberController extends Controller
{
    public function __invoke(StoreMemberRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');

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

        $existingUser = User::query()->where('email', $validated['email'])->first();
        $existingMemberForUser = null;

        if ($existingUser) {
            $existingMemberForUser = Member::query()
                ->where('company_id', $currentCompany->id)
                ->where('user_id', $existingUser->id)
                ->first();
        }

        $phoneConflictQuery = User::query()->where('phone', $validated['phone']);
        if ($existingUser) {
            $phoneConflictQuery->where('id', '!=', $existingUser->id);
        }

        if ($phoneConflictQuery->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Phone already exists.',
            ], 422);
        }

        $employeeCodeConflictQuery = Member::query()
            ->where('company_id', $currentCompany->id)
            ->where('employee_code', $validated['employee_code']);

        if ($existingMemberForUser) {
            $employeeCodeConflictQuery->where('id', '!=', $existingMemberForUser->id);
        }

        if ($employeeCodeConflictQuery->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Employee code already exists in this company.',
            ], 422);
        }

        $roleInputs = collect($validated['roles'])->values();
        $roleIds = $roleInputs->filter(fn ($value) => is_numeric($value))->map(fn ($value) => (int) $value)->values();
        $roleCodes = $roleInputs->filter(fn ($value) => is_string($value))->map(fn ($value) => trim($value))->filter()->values();

        $roles = Role::query()
            ->where('company_id', $currentCompany->id)
            ->where(function ($query) use ($roleIds, $roleCodes): void {
                if ($roleIds->isNotEmpty()) {
                    $query->orWhereIn('id', $roleIds->all());
                }

                if ($roleCodes->isNotEmpty()) {
                    $query->orWhereIn('code', $roleCodes->all());
                }
            })
            ->get();

        if ($roles->count() !== $roleInputs->count()) {
            return response()->json([
                'success' => false,
                'message' => 'One or more roles are invalid for the active company.',
            ], 422);
        }

        $member = DB::transaction(function () use ($validated, $currentCompany, $roles, $existingUser, $existingMemberForUser): Member {
            $user = $existingUser;

            if (! $user) {
                $user = User::query()->create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'],
                    'password' => Hash::make(Str::random(32)),
                    'is_active' => true,
                    'is_superadmin' => false,
                ]);
            } else {
                $user->forceFill([
                    'name' => $validated['name'],
                    'phone' => $validated['phone'],
                ])->save();
            }

            if ($existingMemberForUser) {
                $member = $existingMemberForUser;
                $member->forceFill([
                    'department_id' => $validated['department_id'] ?? $member->department_id,
                    'job_title' => $validated['job_title'] ?? $member->job_title,
                    'employee_code' => $validated['employee_code'],
                    'status' => 'active',
                ])->save();
            } else {
                $member = Member::query()->create([
                    'company_id' => $currentCompany->id,
                    'user_id' => $user->id,
                    'department_id' => $validated['department_id'] ?? null,
                    'employee_code' => $validated['employee_code'],
                    'job_title' => $validated['job_title'] ?? null,
                    'status' => 'active',
                ]);
            }

            $member->roles()->sync($roles->pluck('id')->all());

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

            return $member->load(['user', 'roles']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Member created/updated successfully. Password setup has been triggered.',
            'data' => [
                'member' => MemberResource::make($member)->resolve(),
            ],
        ], 201);
    }
}
