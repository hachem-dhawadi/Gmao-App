<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Resources\Api\V1\Auth\AuthUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => AuthUserResource::make($user)->resolve(),
                'token' => $token,
                'token_type' => 'Bearer',
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
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember = $request->attributes->get('currentMember');

        return response()->json([
            'success' => true,
            'message' => 'Current user retrieved successfully.',
            'data' => [
                'user' => AuthUserResource::make($user)->resolve(),
                'current_company' => $currentCompany ? [
                    'id' => $currentCompany->id,
                    'name' => $currentCompany->name,
                    'legal_name' => $currentCompany->legal_name,
                    'timezone' => $currentCompany->timezone,
                    'is_active' => (bool) $currentCompany->is_active,
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
}
