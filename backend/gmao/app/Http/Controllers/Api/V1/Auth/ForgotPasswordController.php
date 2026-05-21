<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ForgotPasswordController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::query()->where('email', $request->email)->first();

        // Always return the same response to prevent email enumeration
        if (! $user) {
            return response()->json([
                'success' => true,
                'message' => 'If this email is registered, a reset link has been sent.',
            ]);
        }

        $plainToken = Str::random(64);

        PasswordResetToken::query()
            ->where('user_id', $user->id)
            ->delete();

        PasswordResetToken::query()->create([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'token_hash' => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $resetUrl = $frontendUrl.'/reset-password?token='.urlencode($plainToken).'&email='.urlencode($user->email);

        // Log the reset URL when mail driver is "log" (dev mode)
        if (config('mail.default') === 'log') {
            \Illuminate\Support\Facades\Log::info('Password reset link for '.$user->email.': '.$resetUrl);
        }

        \Illuminate\Support\Facades\Mail::raw(
            "Hello {$user->name},\n\nClick the link below to reset your password (expires in 60 minutes):\n\n{$resetUrl}\n\nIf you did not request a password reset, please ignore this email.",
            function ($message) use ($user) {
                $message->to($user->email, $user->name)
                    ->subject('Reset your password');
            }
        );

        return response()->json([
            'success' => true,
            'message' => 'If this email is registered, a reset link has been sent.',
        ]);
    }
}
