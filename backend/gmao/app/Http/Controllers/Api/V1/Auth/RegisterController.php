<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use App\Http\Resources\Api\V1\Auth\AuthUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request, OtpController $otp): JsonResponse
    {
        $validated = $request->validated();

        $user = User::query()->create([
            'name'           => $validated['name'],
            'email'          => $validated['email'],
            'password'       => $validated['password'],
            'phone'          => null,
            'is_active'      => true,
            'is_superadmin'  => false,
            'email_verified_at' => null,
        ]);

        // Send verification OTP — failure is non-fatal (user can resend)
        try {
            $otp->issueOtp($user);
        } catch (\Throwable) {
        }

        $deviceName = $validated['device_name'] ?? 'api-client';
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Account created. Please verify your email.',
            'data' => [
                'user'               => AuthUserResource::make($user)->resolve(),
                'token'              => $token,
                'token_type'         => 'Bearer',
                'default_company_id' => null,
                'memberships'        => [],
                'requires_otp'       => true,
            ],
        ], 201);
    }
}
