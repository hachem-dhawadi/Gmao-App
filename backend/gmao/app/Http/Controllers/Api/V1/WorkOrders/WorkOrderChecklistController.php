<?php

namespace App\Http\Controllers\Api\V1\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class WorkOrderChecklistController extends Controller
{
    public function store(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
        }

        $validated = $request->validate(['title' => 'required|string|max:500']);

        $maxOrder = WorkOrderChecklistItem::where('work_order_id', $workOrder->id)->max('order_index') ?? -1;

        $item = WorkOrderChecklistItem::create([
            'work_order_id' => $workOrder->id,
            'title'         => $validated['title'],
            'is_completed'  => false,
            'order_index'   => $maxOrder + 1,
        ]);

        return response()->json([
            'success' => true,
            'data'    => ['item' => $this->format($item)],
        ], 201);
    }

    public function toggle(Request $request, WorkOrder $workOrder, WorkOrderChecklistItem $item): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
        }

        if ((int) $item->work_order_id !== (int) $workOrder->id) {
            return response()->json(['success' => false, 'message' => 'Checklist item not found.'], 404);
        }

        $nowCompleted = ! $item->is_completed;

        $item->update([
            'is_completed'           => $nowCompleted,
            'completed_at'           => $nowCompleted ? Carbon::now() : null,
            'completed_by_member_id' => $nowCompleted ? $currentMember?->id : null,
        ]);

        $item->load('completedBy.user');

        return response()->json([
            'success' => true,
            'data'    => [
                'item' => [
                    'id'           => $item->id,
                    'is_completed' => $item->is_completed,
                    'completed_at' => $item->completed_at?->toISOString(),
                    'completed_by' => $item->completedBy?->user?->name,
                ],
            ],
        ]);
    }

    public function destroy(Request $request, WorkOrder $workOrder, WorkOrderChecklistItem $item): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ((int) $item->work_order_id !== (int) $workOrder->id) {
            return response()->json(['success' => false, 'message' => 'Checklist item not found.'], 404);
        }

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item deleted.']);
    }

    private function format(WorkOrderChecklistItem $item): array
    {
        return [
            'id'           => $item->id,
            'title'        => $item->title,
            'is_completed' => $item->is_completed,
            'completed_at' => $item->completed_at?->toISOString(),
            'completed_by' => $item->completedBy?->user?->name ?? null,
            'order_index'  => $item->order_index,
        ];
    }
}
