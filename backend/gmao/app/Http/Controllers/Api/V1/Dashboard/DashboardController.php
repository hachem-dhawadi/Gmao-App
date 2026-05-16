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
use Illuminate\Support\Facades\DB;

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

        // Monthly WO stats (last 6 months)
        $monthlyStats = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = $now->copy()->subMonths($i)->startOfMonth();
            $end   = $now->copy()->subMonths($i)->endOfMonth();
            $monthlyStats[] = [
                'month'     => $start->format('M'),
                'active'    => (clone $woBase)->whereBetween('opened_at', [$start, $end])->count(),
                'completed' => (clone $woBase)->where('status', 'completed')->whereBetween('closed_at', [$start, $end])->count(),
            ];
        }

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
                'monthly_stats'      => $monthlyStats,
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

        $now                = Carbon::now();
        $startOfWeek        = $now->copy()->startOfWeek();
        $endOfWeek          = $now->copy()->addDays(7);
        $startOfMonth       = $now->copy()->startOfMonth();
        $endOfMonth         = $now->copy()->endOfMonth();
        $startOfLastMonth   = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth     = $now->copy()->subMonth()->endOfMonth();
        $startOfLastWeek    = $now->copy()->subWeek()->startOfWeek();
        $endOfLastWeek      = $now->copy()->subWeek()->endOfWeek();

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

        // ── vs last month deltas ──────────────────────────────────────────────

        // Open: WOs opened this month vs last month
        $openedThisMonth  = (clone $woBase)->whereBetween('opened_at', [$startOfMonth, $now])->count();
        $openedLastMonth  = (clone $woBase)->whereBetween('opened_at', [$startOfLastMonth, $endOfLastMonth])->count();
        $openGrowShrink   = $openedLastMonth > 0
            ? (int) round(($openedThisMonth - $openedLastMonth) / $openedLastMonth * 100)
            : ($openedThisMonth > 0 ? 100 : 0);

        // In Progress: current count vs count at end of last month
        $inProgressLastMonth  = (clone $woBase)
            ->where('status', 'in_progress')
            ->where('opened_at', '<=', $endOfLastMonth)
            ->count();
        $inProgressGrowShrink = $inProgressLastMonth > 0
            ? (int) round(($myProgress - $inProgressLastMonth) / $inProgressLastMonth * 100)
            : ($myProgress > 0 ? 100 : 0);

        // Done this week vs same window last week
        $doneLastWeek        = (clone $woBase)
            ->where('status', 'completed')
            ->whereBetween('closed_at', [$startOfLastWeek, $endOfLastWeek])
            ->count();
        $doneWeekGrowShrink  = $doneLastWeek > 0
            ? (int) round(($myDoneWeek - $doneLastWeek) / $doneLastWeek * 100)
            : ($myDoneWeek > 0 ? 100 : 0);

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
            ->limit(10)
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

        // ── Performance scores (all-time, all assigned WOs) ───────────────────

        $allCompleted = (clone $woBase)->where('status', 'completed')->count();
        $onHold       = (clone $woBase)->where('status', 'on_hold')->count();
        $totalEver    = $myOpen + $myProgress + $myOverdue + $allCompleted + $onHold;

        // Completion: all-time completed / total ever
        $completionScore = $totalEver > 0
            ? (int) round($allCompleted / $totalEver * 100)
            : 0;

        // Completion rate last month (completed before this month / assigned before this month)
        $completedBeforeThisMonth = (clone $woBase)->where('status', 'completed')->where('closed_at', '<', $startOfMonth)->count();
        $totalBeforeThisMonth     = (clone $woBase)->where('opened_at', '<', $startOfMonth)->count();
        $lastMonthCompletionRate  = $totalBeforeThisMonth > 0
            ? (int) round($completedBeforeThisMonth / $totalBeforeThisMonth * 100)
            : 0;
        $completionGrowShrink     = $completionScore - $lastMonthCompletionRate;

        // On Time: (total - overdue) / total
        $onTimeScore = $totalEver > 0
            ? (int) round(($totalEver - $myOverdue) / $totalEver * 100)
            : 100;

        // Response: WOs that moved past "open" (in_progress or completed)
        $responseScore = $totalEver > 0
            ? (int) round(($myProgress + $allCompleted) / $totalEver * 100)
            : 100;

        // Workload: actual labor_minutes logged vs sum of estimated_minutes planned
        $totalLogged = DB::table('work_logs')
            ->join('work_orders', 'work_logs.work_order_id', '=', 'work_orders.id')
            ->where('work_logs.member_id', $member->id)
            ->where('work_orders.company_id', $company->id)
            ->whereNull('work_orders.deleted_at')
            ->sum('work_logs.labor_minutes');

        $totalEstimated = (clone $woBase)->whereNotNull('estimated_minutes')->sum('estimated_minutes');

        $workloadScore = $totalEstimated > 0
            ? (int) min(100, round($totalLogged / $totalEstimated * 100))
            : 0;

        // Efficiency: completed on or before due_at / total completed with a due_at
        $completedWithDue = (clone $woBase)->where('status', 'completed')->whereNotNull('due_at')->count();
        $completedOnTime  = (clone $woBase)
            ->where('status', 'completed')
            ->whereNotNull('due_at')
            ->whereNotNull('closed_at')
            ->whereColumn('closed_at', '<=', 'due_at')
            ->count();
        $efficiencyScore = $completedWithDue > 0
            ? (int) round($completedOnTime / $completedWithDue * 100)
            : 100;

        // ── Monthly chart data (last 6 months) ───────────────────────────────

        $monthlyStats = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = $now->copy()->subMonths($i)->startOfMonth();
            $end   = $now->copy()->subMonths($i)->endOfMonth();
            $monthlyStats[] = [
                'month'     => $start->format('M'),
                'active'    => (clone $woBase)->whereBetween('opened_at', [$start, $end])->count(),
                'completed' => (clone $woBase)->where('status', 'completed')->whereBetween('closed_at', [$start, $end])->count(),
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'my_work_orders' => [
                    'open'                    => $myOpen,
                    'in_progress'             => $myProgress,
                    'overdue'                 => $myOverdue,
                    'completed_week'          => $myDoneWeek,
                    'open_grow_shrink'        => $openGrowShrink,
                    'in_progress_grow_shrink' => $inProgressGrowShrink,
                    'completion_grow_shrink'  => $completionGrowShrink,
                    'done_week_grow_shrink'   => $doneWeekGrowShrink,
                ],
                'my_pm' => [
                    'due_week'   => $myPmWeek,
                    'due_month'  => $myPmMonth,
                ],
                'performance_scores' => [
                    'completion' => $completionScore,
                    'on_time'    => $onTimeScore,
                    'response'   => $responseScore,
                    'workload'   => $workloadScore,
                    'efficiency' => $efficiencyScore,
                ],
                'monthly_stats'         => $monthlyStats,
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

        $now                = Carbon::now();
        $startOfMonth       = $now->copy()->startOfMonth();
        $startOfLastMonth   = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth     = $now->copy()->subMonth()->endOfMonth();

        $memberBase = Member::query()->where('company_id', $company->id);

        $totalMembers    = (clone $memberBase)->count();
        $activeMembers   = (clone $memberBase)->where('status', 'active')->count();
        $inactiveMembers = $totalMembers - $activeMembers;

        // GrowShrink: new members this month vs last month
        $newThisMonth  = (clone $memberBase)->whereBetween('created_at', [$startOfMonth, $now])->count();
        $newLastMonth  = (clone $memberBase)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count();
        $memberGrowShrink = $newLastMonth > 0
            ? (int) round(($newThisMonth - $newLastMonth) / $newLastMonth * 100)
            : ($newThisMonth > 0 ? 100 : 0);

        // Monthly stats: new members per month for last 6 months
        $monthlyStats = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = $now->copy()->subMonths($i)->startOfMonth();
            $end   = $now->copy()->subMonths($i)->endOfMonth();
            $monthlyStats[] = [
                'month' => $start->format('M'),
                'count' => (clone $memberBase)->whereBetween('created_at', [$start, $end])->count(),
            ];
        }

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
                'member_grow_shrink' => $memberGrowShrink,
                'monthly_stats'      => $monthlyStats,
                'by_role'            => $byRole,
                'recent_members'     => $recentMembers,
            ],
        ]);
    }
}
