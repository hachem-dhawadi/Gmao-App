<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ResetPasswordController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'email'                 => ['required', 'string', 'email'],
            'token'                 => ['required', 'string'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = PasswordResetToken::query()
            ->where('email', $request->email)
            ->latest('created_at')
            ->first();

        if (! $record || ! Hash::check($request->token, $record->token_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'This reset link is invalid or has already been used.',
            ], 422);
        }

        // Tokens expire after 60 minutes
        if ($record->created_at->addMinutes(60)->isPast()) {
            $record->delete();

            return response()->json([
                'success' => false,
                'message' => 'This reset link has expired. Please request a new one.',
            ], 422);
        }

        $user = User::query()->where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 422);
        }

        $user->forceFill(['password' => $request->password])->save();

        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now sign in.',
        ]);
    }
}
