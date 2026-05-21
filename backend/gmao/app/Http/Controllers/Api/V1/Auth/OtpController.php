<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OtpController extends Controller
{
    private const PURPOSE   = 'email_verification';
    private const CHANNEL   = 'email';
    private const TTL_MIN   = 10;
    private const MAX_TRIES = 5;

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::query()->where('email', $request->email)->first();

        if (! $user) {
            // Prevent email enumeration — always look like success
            return response()->json([
                'success' => true,
                'message' => 'If this email is registered, a verification code has been sent.',
            ]);
        }

        if ($user->email_verified_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'This email is already verified.',
            ], 422);
        }

        $rateLimiterKey = 'otp-send:'.$user->id;
        if (RateLimiter::tooManyAttempts($rateLimiterKey, 3)) {
            $seconds = RateLimiter::availableIn($rateLimiterKey);

            return response()->json([
                'success' => false,
                'message' => "Too many requests. Please wait {$seconds} seconds before resending.",
            ], 429);
        }

        RateLimiter::hit($rateLimiterKey, 60);

        $this->issueOtp($user);

        return response()->json([
            'success' => true,
            'message' => 'Verification code sent to your email.',
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'code'  => ['required', 'string', 'digits:6'],
        ]);

        $user = User::query()->where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code.',
            ], 422);
        }

        if ($user->email_verified_at !== null) {
            return response()->json([
                'success' => true,
                'message' => 'Email already verified.',
            ]);
        }

        $otpRecord = OtpCode::query()
            ->where('user_id', $user->id)
            ->where('channel', self::CHANNEL)
            ->where('purpose', self::PURPOSE)
            ->whereNull('consumed_at')
            ->latest('created_at')
            ->first();

        if (! $otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'No active verification code found. Please request a new one.',
            ], 422);
        }

        if ($otpRecord->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'Verification code has expired. Please request a new one.',
            ], 422);
        }

        if ($otpRecord->attempts >= self::MAX_TRIES) {
            return response()->json([
                'success' => false,
                'message' => 'Too many failed attempts. Please request a new code.',
            ], 422);
        }

        if (! Hash::check($request->code, $otpRecord->code_hash)) {
            $otpRecord->increment('attempts');

            $remaining = self::MAX_TRIES - $otpRecord->fresh()->attempts;

            return response()->json([
                'success' => false,
                'message' => "Invalid code. {$remaining} attempt(s) remaining.",
            ], 422);
        }

        $otpRecord->update(['consumed_at' => now()]);

        $user->forceFill(['email_verified_at' => now()])->save();

        RateLimiter::clear('otp-send:'.$user->id);

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
        ]);
    }

    public function issueOtp(User $user): void
    {
        // Invalidate any previous active OTPs for this user/purpose
        OtpCode::query()
            ->where('user_id', $user->id)
            ->where('channel', self::CHANNEL)
            ->where('purpose', self::PURPOSE)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $plainCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        OtpCode::query()->create([
            'user_id'    => $user->id,
            'channel'    => self::CHANNEL,
            'purpose'    => self::PURPOSE,
            'code_hash'  => Hash::make($plainCode),
            'expires_at' => now()->addMinutes(self::TTL_MIN),
            'attempts'   => 0,
            'created_at' => now(),
        ]);

        if (config('mail.default') === 'log') {
            Log::info("OTP for {$user->email}: {$plainCode} (expires in ".self::TTL_MIN." min)");
        }

        Mail::raw(
            "Hello {$user->name},\n\nYour email verification code is:\n\n  {$plainCode}\n\nThis code expires in ".self::TTL_MIN." minutes.\n\nIf you did not request this, please ignore this email.",
            function ($message) use ($user): void {
                $message->to($user->email, $user->name)
                    ->subject('Your verification code');
            }
        );
    }
}
