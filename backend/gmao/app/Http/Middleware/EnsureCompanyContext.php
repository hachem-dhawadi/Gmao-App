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

        // Superadmin bypasses membership check — load company directly
        if ($user->is_superadmin) {
            $company = \App\Models\Company::find((int) $companyId);

            if (! $company) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Company not found.',
                ], 404);
            }

            $request->attributes->set('currentCompany', $company);
            $request->attributes->set('currentMember', null);

            return $next($request);
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

        if ($member->status !== 'active') {
            return new JsonResponse([
                'success' => false,
                'message' => 'Your membership is not active in this company.',
            ], 403);
        }

        if (! $member->company) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Company not found.',
            ], 403);
        }

        if ($member->company->approval_status !== 'approved') {
            if ($member->company->approval_status === 'rejected') {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'Company was rejected by superadmin.',
                    'code' => 'company_rejected',
                ], 403);
            }

            return new JsonResponse([
                'success' => false,
                'message' => 'Company pending superadmin approval.',
                'code' => 'company_pending',
            ], 403);
        }

        if (! $member->company->is_active) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Company is currently suspended. Please contact the platform administrator.',
                'code' => 'company_suspended',
            ], 403);
        }

        $request->attributes->set('currentCompany', $member->company);
        $request->attributes->set('currentMember', $member);

        return $next($request);
    }
}
