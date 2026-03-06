<?php

namespace App\Http\Middleware;

use App\Models\Member;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $companyId = $request->header('X-Company-Id');

        if (! is_string($companyId) || ! ctype_digit($companyId)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Header X-Company-Id is required and must be a valid integer.',
            ], 422);
        }

        $member = Member::query()
            ->with('company')
            ->where('company_id', (int) $companyId)
            ->where('user_id', $user->id)
            ->first();

        if (! $member) {
            return new JsonResponse([
                'success' => false,
                'message' => 'You are not a member of the selected company.',
            ], 403);
        }

        if (! $member->company || ! $member->company->is_active) {
            return new JsonResponse([
                'success' => false,
                'message' => 'The selected company is inactive or unavailable.',
            ], 403);
        }

        $request->attributes->set('currentCompany', $member->company);
        $request->attributes->set('currentMember', $member);

        return $next($request);
    }
}
