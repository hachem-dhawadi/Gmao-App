<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class EnsureMemberHasPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        $member = $request->attributes->get('currentMember');

        if (! $user) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (! $member) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Company context is missing. Apply company context middleware first.',
            ], 400);
        }

        $hasPermission = DB::table('member_roles as mr')
            ->join('roles as r', 'r.id', '=', 'mr.role_id')
            ->join('role_permissions as rp', 'rp.role_id', '=', 'r.id')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->where('mr.member_id', $member->id)
            ->where('r.company_id', $member->company_id)
            ->whereNull('r.deleted_at')
            ->where('p.code', $permission)
            ->exists();

        if (! $hasPermission) {
            return new JsonResponse([
                'success' => false,
                'message' => 'You do not have permission: '.$permission,
            ], 403);
        }

        return $next($request);
    }
}
