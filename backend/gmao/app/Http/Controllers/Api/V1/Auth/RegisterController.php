<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Direct user registration is disabled. Use /api/v1/auth/register-company for owner onboarding.',
        ], 422);
    }
}
