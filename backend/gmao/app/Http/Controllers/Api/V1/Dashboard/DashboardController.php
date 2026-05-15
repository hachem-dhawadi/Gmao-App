<?php

namespace App\Http\Controllers\Api\V1\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Member;
use App\Models\PmPlan;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    // ── Admin / Manager ───────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        if (! $company) {
            return response()->json(['success' => false, 'message' => 'Company context missing.'], 400);
        }

        $now            = Carbon::now();
        $startOfMonth   = $now->copy()->startOfMonth();
        $endOfWeek      = $now->copy()->addDays(7);
        $endOfMonth     = $now->copy()->endOfMonth();

        // Work order counts
        $woBase = WorkOrder::query()->where('company_id', $company->id)->whereNull('deleted_at');

        $woOpen            = (clone $woBase)->whereIn('status', ['open', 'in_progress'])->count();
        $woInProgress      = (clone $woBase)->where('status', 'in_progress')->count();
        $woOnHold          = (clone $woBase)->where('status', 'on_hold')->count();
        $woOverdue         = (clone $woBase)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('due_at')
            ->where('due_at', '<', $now)
            ->count();
        $woCompletedMonth  = (clone $woBase)
            ->where('status', 'completed')
            ->whereBetween('closed_at', [$startOfMonth, $now])
            ->count();

        // PM counts
        $pmBase      = PmPlan::query()->where('company_id', $company->id)->whereNull('deleted_at');
        $pmActive    = (clone $pmBase)->where('status', 'active')->count();
        $pmDueWeek   = (clone $pmBase)->whereHas('triggers', fn ($q) => $q->whereBetween('next_run_at', [$now, $endOfWeek]))->count();
        $pmDueMonth  = (clone $pmBase)->whereHas('triggers', fn ($q) => $q->whereBetween('next_run_at', [$now, $endOfMonth]))->count();

        // Other counts
        $totalAssets       = Asset::query()->where('company_id', $company->id)->whereNull('deleted_at')->count();
        $totalActive       = Member::query()->where('company_id', $company->id)->where('status', 'active')->count();
        $totalTechnicians  = Member::query()
            ->where('company_id', $company->id)
            ->where('status', 'active')
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->count();

        // Recent work orders
        $recentWorkOrders = WorkOrder::query()
            ->with(['asset', 'createdBy.user'])
            ->where('company_id', $company->id)
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(fn (WorkOrder $wo) => [
                'id'         => $wo->id,
                'code'       => $wo->code,
                'title'      => $wo->title,
                'status'     => $wo->status,
                'priority'   => $wo->priority,
                'asset'      => $wo->asset ? ['name' => $wo->asset->name] : null,
                'created_at' => $wo->created_at?->toISOString(),
                'due_at'     => $wo->due_at?->toISOString(),
            ]);

        // PM plans due soon
        $pmDueSoon = PmPlan::query()
            ->with(['triggers', 'assignedTo.user'])
            ->where('company_id', $company->id)
            ->where('status', 'active')
            ->whereHas('triggers', fn ($q) => $q->whereBetween('next_run_at', [$now, $endOfMonth]))
            ->limit(6)
            ->get()
            ->map(fn (PmPlan $p) => [
                'id'          => $p->id,
                'code'        => $p->code,
                'name'        => $p->name,
                'priority'    => $p->priority,
                'assigned_to' => $p->assignedTo?->user?->name,
                'next_run_at' => $p->triggers->first()?->next_run_at?->toISOString(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'work_orders' => [
                    'open'             => $woOpen,
                    'in_progress'      => $woInProgress,
                    'on_hold'          => $woOnHold,
                    'overdue'          => $woOverdue,
                    'completed_month'  => $woCompletedMonth,
                ],
                'pm' => [
                    'active'      => $pmActive,
                    'due_week'    => $pmDueWeek,
                    'due_month'   => $pmDueMonth,
                ],
                'assets'  => ['total' => $totalAssets],
                'members' => [
                    'total_active' => $totalActive,
                    'technicians'  => $totalTechnicians,
                ],
                'recent_work_orders' => $recentWorkOrders,
                'pm_due_soon'        => $pmDueSoon,
            ],
        ]);
    }

    // ── Technician ────────────────────────────────────────────────────

    public function my(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        $member  = $request->attributes->get('currentMember');

        if (! $company || ! $member) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $now           = Carbon::now();
        $startOfWeek   = $now->copy()->startOfWeek();
        $endOfWeek     = $now->copy()->addDays(7);
        $endOfMonth    = $now->copy()->endOfMonth();

        $woBase = WorkOrder::query()
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->whereHas('assignedMembers', fn ($q) => $q->where('members.id', $member->id));

        $myOpen      = (clone $woBase)->where('status', 'open')->count();
        $myProgress  = (clone $woBase)->where('status', 'in_progress')->count();
        $myOverdue   = (clone $woBase)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('due_at')
            ->where('due_at', '<', $now)
            ->count();
        $myDoneWeek  = (clone $woBase)
            ->where('status', 'completed')
            ->whereBetween('closed_at', [$startOfWeek, $now])
            ->count();

        $myPmWeek   = PmPlan::query()
            ->where('company_id', $company->id)
            ->where('assigned_member_id', $member->id)
            ->where('status', 'active')
            ->whereHas('triggers', fn ($q) => $q->whereBetween('next_run_at', [$now, $endOfWeek]))
            ->count();

        $myPmMonth  = PmPlan::query()
            ->where('company_id', $company->id)
            ->where('assigned_member_id', $member->id)
            ->where('status', 'active')
            ->whereHas('triggers', fn ($q) => $q->whereBetween('next_run_at', [$now, $endOfMonth]))
            ->count();

        $myRecentWo = WorkOrder::query()
            ->with(['asset'])
            ->where('company_id', $company->id)
            ->whereHas('assignedMembers', fn ($q) => $q->where('members.id', $member->id))
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (WorkOrder $wo) => [
                'id'       => $wo->id,
                'code'     => $wo->code,
                'title'    => $wo->title,
                'status'   => $wo->status,
                'priority' => $wo->priority,
                'asset'    => $wo->asset ? ['name' => $wo->asset->name] : null,
                'due_at'   => $wo->due_at?->toISOString(),
            ]);

        $myPmDueSoon = PmPlan::query()
            ->with(['triggers'])
            ->where('company_id', $company->id)
            ->where('assigned_member_id', $member->id)
            ->where('status', 'active')
            ->whereHas('triggers', fn ($q) => $q->whereBetween('next_run_at', [$now, $endOfMonth]))
            ->limit(5)
            ->get()
            ->map(fn (PmPlan $p) => [
                'id'          => $p->id,
                'code'        => $p->code,
                'name'        => $p->name,
                'priority'    => $p->priority,
                'next_run_at' => $p->triggers->first()?->next_run_at?->toISOString(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'my_work_orders' => [
                    'open'            => $myOpen,
                    'in_progress'     => $myProgress,
                    'overdue'         => $myOverdue,
                    'completed_week'  => $myDoneWeek,
                ],
                'my_pm' => [
                    'due_week'   => $myPmWeek,
                    'due_month'  => $myPmMonth,
                ],
                'my_recent_work_orders' => $myRecentWo,
                'my_pm_due_soon'        => $myPmDueSoon,
            ],
        ]);
    }

    // ── HR ────────────────────────────────────────────────────────────

    public function hr(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        if (! $company) {
            return response()->json(['success' => false, 'message' => 'Company context missing.'], 400);
        }

        $totalMembers   = Member::query()->where('company_id', $company->id)->count();
        $activeMembers  = Member::query()->where('company_id', $company->id)->where('status', 'active')->count();
        $inactiveMembers = $totalMembers - $activeMembers;

        $byRole = Member::query()
            ->where('company_id', $company->id)
            ->with('roles')
            ->get()
            ->flatMap(fn (Member $m) => $m->roles)
            ->groupBy('code')
            ->map(fn ($roles, $code) => [
                'code'  => $code,
                'label' => $roles->first()->label,
                'count' => $roles->count(),
            ])
            ->values();

        $recentMembers = Member::query()
            ->with('user', 'roles')
            ->where('company_id', $company->id)
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(fn (Member $m) => [
                'id'            => $m->id,
                'name'          => $m->user?->name,
                'email'         => $m->user?->email,
                'job_title'     => $m->job_title,
                'status'        => $m->status,
                'role'          => $m->roles->first()?->label,
                'created_at'    => $m->created_at?->toISOString(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'members' => [
                    'total'    => $totalMembers,
                    'active'   => $activeMembers,
                    'inactive' => $inactiveMembers,
                ],
                'by_role'        => $byRole,
                'recent_members' => $recentMembers,
            ],
        ]);
    }
}
