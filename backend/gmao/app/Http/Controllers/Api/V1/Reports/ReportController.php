<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Item;
use App\Models\Member;
use App\Models\PmPlan;
use App\Models\PmTrigger;
use App\Models\StockMove;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    // ── Work Orders Report ────────────────────────────────────────────────────

    public function workOrders(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        if (! $company) return response()->json(['success' => false, 'message' => 'Company context missing.'], 400);

        $now   = Carbon::now();
        $woBase = WorkOrder::query()->where('company_id', $company->id)->whereNull('deleted_at');

        // Monthly stats — last 6 months
        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = $now->copy()->subMonths($i)->startOfMonth();
            $end   = $now->copy()->subMonths($i)->endOfMonth();
            $monthly[] = [
                'month'     => $start->format('M Y'),
                'created'   => (clone $woBase)->whereBetween('opened_at', [$start, $end])->count(),
                'completed' => (clone $woBase)->where('status', 'completed')->whereBetween('closed_at', [$start, $end])->count(),
            ];
        }

        // By status
        $byStatus = [
            'open'        => (clone $woBase)->where('status', 'open')->count(),
            'in_progress' => (clone $woBase)->where('status', 'in_progress')->count(),
            'on_hold'     => (clone $woBase)->where('status', 'on_hold')->count(),
            'completed'   => (clone $woBase)->where('status', 'completed')->count(),
            'cancelled'   => (clone $woBase)->where('status', 'cancelled')->count(),
        ];

        // By priority
        $byPriority = [
            'critical' => (clone $woBase)->where('priority', 'critical')->count(),
            'high'     => (clone $woBase)->where('priority', 'high')->count(),
            'medium'   => (clone $woBase)->where('priority', 'medium')->count(),
            'low'      => (clone $woBase)->where('priority', 'low')->count(),
        ];

        // Average resolution time (hours) this month
        $startOfMonth = $now->copy()->startOfMonth();
        $avgResolution = WorkOrder::query()
            ->where('company_id', $company->id)
            ->where('status', 'completed')
            ->whereBetween('closed_at', [$startOfMonth, $now])
            ->whereNotNull('opened_at')
            ->whereNotNull('closed_at')
            ->select(DB::raw('AVG(TIMESTAMPDIFF(HOUR, opened_at, closed_at)) as avg_hours'))
            ->value('avg_hours');

        // Top technicians by WOs completed (all time)
        $topTechnicians = DB::table('work_order_member')
            ->join('work_orders', 'work_order_member.work_order_id', '=', 'work_orders.id')
            ->join('members', 'work_order_member.member_id', '=', 'members.id')
            ->join('users', 'members.user_id', '=', 'users.id')
            ->where('work_orders.company_id', $company->id)
            ->where('work_orders.status', 'completed')
            ->whereNull('work_orders.deleted_at')
            ->select('users.name', DB::raw('COUNT(*) as completed_count'))
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('completed_count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'completed' => $r->completed_count]);

        return response()->json([
            'success' => true,
            'data'    => [
                'monthly'          => $monthly,
                'by_status'        => $byStatus,
                'by_priority'      => $byPriority,
                'avg_resolution_h' => $avgResolution ? round((float) $avgResolution, 1) : null,
                'top_technicians'  => $topTechnicians,
            ],
        ]);
    }

    // ── Assets Report ─────────────────────────────────────────────────────────

    public function assets(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        if (! $company) return response()->json(['success' => false, 'message' => 'Company context missing.'], 400);

        $now = Carbon::now();

        $assets = Asset::query()
            ->where('assets.company_id', $company->id)
            ->whereNull('assets.deleted_at')
            ->leftJoin('work_orders', function ($join) {
                $join->on('work_orders.asset_id', '=', 'assets.id')
                     ->whereNull('work_orders.deleted_at');
            })
            ->select(
                'assets.id',
                'assets.code',
                'assets.name',
                'assets.location',
                DB::raw('COUNT(work_orders.id) as wo_count'),
                DB::raw('SUM(CASE WHEN work_orders.status = "completed" AND work_orders.opened_at IS NOT NULL AND work_orders.closed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, work_orders.opened_at, work_orders.closed_at) ELSE 0 END) as total_downtime_h'),
                DB::raw('MAX(work_orders.closed_at) as last_maintenance_at')
            )
            ->groupBy('assets.id', 'assets.code', 'assets.name', 'assets.location')
            ->orderByDesc('wo_count')
            ->limit(20)
            ->get()
            ->map(fn ($a) => [
                'id'                => $a->id,
                'code'              => $a->code,
                'name'              => $a->name,
                'location'          => $a->location,
                'wo_count'          => (int) $a->wo_count,
                'total_downtime_h'  => (float) $a->total_downtime_h,
                'last_maintenance_at' => $a->last_maintenance_at,
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['assets' => $assets],
        ]);
    }

    // ── PM Compliance Report ──────────────────────────────────────────────────

    public function pmCompliance(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        if (! $company) return response()->json(['success' => false, 'message' => 'Company context missing.'], 400);

        $now = Carbon::now();

        // Monthly compliance for last 6 months
        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = $now->copy()->subMonths($i)->startOfMonth();
            $end   = $now->copy()->subMonths($i)->endOfMonth();

            $ran = PmTrigger::query()
                ->whereHas('pmPlan', fn ($q) => $q->where('company_id', $company->id))
                ->whereBetween('last_run_at', [$start, $end])
                ->count();

            // Overdue = triggers whose next_run_at fell in this period but never ran (or ran after the period)
            $overdue = PmTrigger::query()
                ->whereHas('pmPlan', fn ($q) => $q->where('company_id', $company->id)->where('status', 'active'))
                ->whereBetween('next_run_at', [$start, $end])
                ->where(fn ($q) => $q->whereNull('last_run_at')->orWhere('last_run_at', '>', $end))
                ->count();

            $total      = $ran + $overdue;
            $compliance = $total > 0 ? (int) round($ran / $total * 100) : ($i === 0 ? 100 : null);

            $monthly[] = [
                'month'      => $start->format('M Y'),
                'ran'        => $ran,
                'overdue'    => $overdue,
                'compliance' => $compliance,
            ];
        }

        // PM plan list with status
        $plans = PmPlan::query()
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->with(['triggers', 'assignedTo.user'])
            ->get()
            ->map(function (PmPlan $p) use ($now) {
                $trigger     = $p->triggers->first();
                $lastRun     = $trigger?->last_run_at;
                $nextRun     = $trigger?->next_run_at;
                $isOverdue   = $nextRun && $nextRun->lt($now) && (!$lastRun || $lastRun->lt($nextRun));
                $neverRun    = ! $lastRun;

                $status = $neverRun ? 'never_run' : ($isOverdue ? 'overdue' : 'on_time');

                return [
                    'id'          => $p->id,
                    'code'        => $p->code,
                    'name'        => $p->name,
                    'status'      => $p->status,
                    'assigned_to' => $p->assignedTo?->user?->name,
                    'last_run_at' => $lastRun?->toISOString(),
                    'next_run_at' => $nextRun?->toISOString(),
                    'compliance_status' => $status,
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => [
                'monthly' => $monthly,
                'plans'   => $plans,
            ],
        ]);
    }

    // ── Inventory & Cost Report ───────────────────────────────────────────────

    public function inventory(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        if (! $company) return response()->json(['success' => false, 'message' => 'Company context missing.'], 400);

        $now          = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfYear  = $now->copy()->startOfYear();

        // Parts used on WOs (stock_moves with move_type=out linked to work_orders)
        $partsBase = StockMove::query()
            ->join('items', 'stock_moves.item_id', '=', 'items.id')
            ->where('items.company_id', $company->id)
            ->whereNotNull('stock_moves.work_order_id')
            ->where('stock_moves.move_type', 'out');

        $costMonth = (clone $partsBase)
            ->whereBetween('stock_moves.created_at', [$startOfMonth, $now])
            ->select(DB::raw('SUM(ABS(stock_moves.quantity) * COALESCE(stock_moves.unit_cost, items.unit_price, 0)) as total'))
            ->value('total') ?? 0;

        $costYear = (clone $partsBase)
            ->whereBetween('stock_moves.created_at', [$startOfYear, $now])
            ->select(DB::raw('SUM(ABS(stock_moves.quantity) * COALESCE(stock_moves.unit_cost, items.unit_price, 0)) as total'))
            ->value('total') ?? 0;

        // Top 10 most used items (by quantity consumed on WOs)
        $topItems = StockMove::query()
            ->join('items', 'stock_moves.item_id', '=', 'items.id')
            ->where('items.company_id', $company->id)
            ->whereNotNull('stock_moves.work_order_id')
            ->where('stock_moves.move_type', 'out')
            ->select(
                'items.id',
                'items.code',
                'items.name',
                'items.unit',
                DB::raw('SUM(ABS(stock_moves.quantity)) as total_used'),
                DB::raw('SUM(ABS(stock_moves.quantity) * COALESCE(stock_moves.unit_cost, items.unit_price, 0)) as total_cost')
            )
            ->groupBy('items.id', 'items.code', 'items.name', 'items.unit')
            ->orderByDesc('total_used')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'id'         => $r->id,
                'code'       => $r->code,
                'name'       => $r->name,
                'unit'       => $r->unit,
                'total_used' => (float) $r->total_used,
                'total_cost' => round((float) $r->total_cost, 2),
            ]);

        // Current stock value (all items in company)
        $stockValue = DB::table('stock_moves')
            ->join('items', 'stock_moves.item_id', '=', 'items.id')
            ->join('warehouses', 'stock_moves.warehouse_id', '=', 'warehouses.id')
            ->where('items.company_id', $company->id)
            ->whereNull('items.deleted_at')
            ->select(DB::raw('SUM(stock_moves.quantity * COALESCE(items.unit_price, 0)) as value'))
            ->value('value') ?? 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'cost_month'  => round((float) $costMonth, 2),
                'cost_year'   => round((float) $costYear, 2),
                'stock_value' => round((float) $stockValue, 2),
                'top_items'   => $topItems,
            ],
        ]);
    }
}
