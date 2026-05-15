<?php

namespace App\Http\Controllers\Api\V1\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\WorkLog;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkLogController extends Controller
{
    public function index(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $logs = $workOrder->workLogs()->with('member.user')->latest()->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'logs'    => $logs->map(fn ($l) => $this->formatLog($l))->values()->all(),
                'summary' => [
                    'total_minutes'  => (int) $logs->sum('labor_minutes'),
                    'total_cost'     => (float) $logs->sum('labor_cost'),
                    'billable_count' => $logs->where('is_billable', true)->count(),
                ],
            ],
        ]);
    }

    public function store(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! in_array($workOrder->status, ['in_progress', 'completed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Work logs can only be added to in-progress or completed work orders.',
            ], 422);
        }

        $validated = $request->validate([
            'labor_minutes' => 'required|integer|min:1',
            'labor_cost'    => 'nullable|numeric|min:0',
            'notes'         => 'nullable|string|max:2000',
        ]);

        $log = $workOrder->workLogs()->create([
            'member_id'     => $currentMember->id,
            'labor_minutes' => $validated['labor_minutes'],
            'labor_cost'    => $validated['labor_cost'] ?? null,
            'notes'         => $validated['notes'] ?? null,
        ]);

        $log->load('member.user');

        return response()->json(['success' => true, 'data' => $this->formatLog($log)], 201);
    }

    public function update(Request $request, WorkOrder $workOrder, WorkLog $workLog): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || (int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $isAdmin   = $this->hasPermission($currentMember, 'work_orders.delete');
        $isManager = $this->hasPermission($currentMember, 'work_orders.assign');

        if (! $isAdmin && ! $isManager) {
            // Technician: own log only, WO must still be in_progress
            if ($workLog->member_id !== $currentMember?->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only edit your own work logs.',
                ], 403);
            }

            if ($workOrder->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Work logs are locked on completed work orders.',
                ], 422);
            }
        }

        $validated = $request->validate([
            'labor_minutes' => 'sometimes|integer|min:1',
            'labor_cost'    => 'nullable|numeric|min:0',
            'notes'         => 'nullable|string|max:2000',
        ]);

        $workLog->update($validated);
        $workLog->load('member.user');

        return response()->json(['success' => true, 'data' => $this->formatLog($workLog)]);
    }

    public function destroy(Request $request, WorkOrder $workOrder, WorkLog $workLog): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || (int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! $this->hasPermission($currentMember, 'work_orders.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Only administrators can delete work logs.',
            ], 403);
        }

        $workLog->delete();

        return response()->json(['success' => true, 'message' => 'Work log deleted.']);
    }

    private function hasPermission($member, string $code): bool
    {
        if (! $member) {
            return false;
        }

        return $member->roles()
            ->whereHas('permissions', fn ($q) => $q->where('code', $code))
            ->exists();
    }

    private function formatLog(WorkLog $log): array
    {
        return [
            'id'            => $log->id,
            'member_id'     => $log->member_id,
            'author'        => $log->member?->user?->name ?? 'Unknown',
            'labor_minutes' => $log->labor_minutes,
            'labor_cost'    => $log->labor_cost !== null ? (float) $log->labor_cost : null,
            'notes'         => $log->notes,
            'created_at'    => $log->created_at?->toISOString(),
        ];
    }
}
