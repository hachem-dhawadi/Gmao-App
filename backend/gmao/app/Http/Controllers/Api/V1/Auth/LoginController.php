<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\UpdatePasswordRequest;
use App\Http\Requests\Api\V1\Auth\UpdateProfileRequest;
use App\Http\Resources\Api\V1\Auth\AuthUserResource;
use App\Models\File;
use App\Models\Member;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class LoginController extends Controller
{
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var User|null $user */
        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 422);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This account is inactive.',
            ], 403);
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $deviceName = $validated['device_name'] ?? 'api-client';
        $token = $user->createToken($deviceName)->plainTextToken;

        $memberships = $user->members()
            ->with([
                'company:id,name,legal_name,is_active,approval_status',
                'roles:id,code,label',
            ])
            ->get()
            ->map(function ($member): array {
                return [
                    'member_id' => $member->id,
                    'company_id' => $member->company_id,
                    'company' => $member->company ? [
                        'id' => $member->company->id,
                        'name' => $member->company->name,
                        'legal_name' => $member->company->legal_name,
                        'is_active' => (bool) $member->company->is_active,
                        'approval_status' => $member->company->approval_status,
                    ] : null,
                    'status' => $member->status,
                    'roles' => $member->roles->map(fn ($role): array => [
                        'id' => $role->id,
                        'code' => $role->code,
                        'label' => $role->label,
                    ])->values()->all(),
                ];
            })
            ->values();

        $defaultMembership = $memberships
            ->first(fn (array $membership): bool => $membership['status'] === 'active'
                && ((bool) data_get($membership, 'company.is_active') === true))
            ?? $memberships->first();

        $defaultCompanyId = $user->is_superadmin
            ? null
            : data_get($defaultMembership, 'company_id');

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => AuthUserResource::make($user)->resolve(),
                'token' => $token,
                'token_type' => 'Bearer',
                'default_company_id' => $defaultCompanyId,
                'memberships' => $memberships,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout successful.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $currentCompany = null;
        $currentMember = null;

        $companyId = $request->header('X-Company-Id');

        if (is_string($companyId) && ctype_digit($companyId)) {
            $currentMember = Member::query()
                ->with('company')
                ->where('user_id', $user->id)
                ->where('company_id', (int) $companyId)
                ->first();
        }

        if (! $currentMember && ! $user->is_superadmin) {
            $currentMember = Member::query()
                ->with('company')
                ->where('user_id', $user->id)
                ->first();
        }

        $currentCompany = $currentMember?->company;

        return response()->json([
            'success' => true,
            'message' => 'Current user retrieved successfully.',
            'data' => [
                'user' => AuthUserResource::make($user)->resolve(),
                'current_company' => $currentCompany ? [
                    'id' => $currentCompany->id,
                    'name' => $currentCompany->name,
                    'legal_name' => $currentCompany->legal_name,
                    'phone' => $currentCompany->phone,
                    'email' => $currentCompany->email,
                    'address_line1' => $currentCompany->address_line1,
                    'address_line2' => $currentCompany->address_line2,
                    'city' => $currentCompany->city,
                    'postal_code' => $currentCompany->postal_code,
                    'country' => $currentCompany->country,
                    'logo_path' => $currentCompany->logo_path,
                    'logo_url' => $currentCompany->logo_path ? Storage::disk('public')->url($currentCompany->logo_path) : null,
                    'timezone' => $currentCompany->timezone,
                    'is_active' => (bool) $currentCompany->is_active,
                    'approval_status' => $currentCompany->approval_status,
                    'proof_files' => $this->transformCompanyProofFiles($currentCompany->id),
                ] : null,
                'current_member' => $currentMember ? [
                    'id' => $currentMember->id,
                    'company_id' => $currentMember->company_id,
                    'user_id' => $currentMember->user_id,
                    'department_id' => $currentMember->department_id,
                    'employee_code' => $currentMember->employee_code,
                    'job_title' => $currentMember->job_title,
                    'status' => $currentMember->status,
                ] : null,
            ],
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        if ($request->boolean('remove_avatar') && $user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->avatar_path = null;
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $validated['avatar_path'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->forceFill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'locale' => $validated['locale'] ?? $user->locale,
            'avatar_path' => $validated['avatar_path'] ?? $user->avatar_path,
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'user' => AuthUserResource::make($user->refresh())->resolve(),
            ],
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        $user->forceFill([
            'password' => $validated['password'],
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function transformCompanyProofFiles(int $companyId): array
    {
        return File::query()
            ->where('company_id', $companyId)
            ->where('category', 'company_proof')
            ->orderByDesc('id')
            ->get(['id', 'original_name', 'mime_type', 'size_bytes', 'is_verified', 'created_at'])
            ->map(static fn (File $file): array => [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'is_verified' => (bool) $file->is_verified,
                'created_at' => $file->created_at,
            ])
            ->values()
            ->all();
    }
}
