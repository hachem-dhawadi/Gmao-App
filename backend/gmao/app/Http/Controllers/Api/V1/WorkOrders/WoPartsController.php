<?php

namespace App\Http\Controllers\Api\V1\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\StockMove;
use App\Models\Warehouse;
use App\Models\WorkOrder;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WoPartsController extends Controller
{
    public function index(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $moves = StockMove::query()
            ->where('work_order_id', $workOrder->id)
            ->where(function ($q) {
                $q->where('move_type', 'out')
                  ->orWhere(fn ($q2) => $q2->where('move_type', 'adjustment')->where('quantity', '<', 0));
            })
            ->with(['item:id,code,name,unit', 'warehouse:id,code,name', 'createdBy.user:id,name'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($m) => $this->format($m));

        return response()->json(['success' => true, 'data' => ['parts' => $moves]]);
    }

    public function store(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        // Technicians can only record parts on WOs they are assigned to
        $isAdminOrManager = $currentMember?->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager) {
            $isAssigned = $workOrder->assignedMembers()->where('members.id', $currentMember->id)->exists();
            if (! $isAssigned) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only record parts on work orders assigned to you.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'item_id'      => 'required|integer|exists:items,id',
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'usage_type'   => 'required|in:used,scrapped',
            'quantity'     => 'required|numeric|min:0.001',
            'notes'        => 'nullable|string|max:2000',
        ]);

        $item = Item::find($validated['item_id']);
        if (! $item || (int) $item->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Item not found.'], 404);
        }
        if (! $item->is_stocked) {
            return response()->json(['success' => false, 'message' => 'This item is not tracked in stock.'], 422);
        }

        $warehouse = Warehouse::find($validated['warehouse_id']);
        if (! $warehouse || (int) $warehouse->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Warehouse not found.'], 404);
        }

        $qty      = (float) $validated['quantity'];
        $isScrap  = $validated['usage_type'] === 'scrapped';
        $moveType = $isScrap ? 'adjustment' : 'out';
        $quantity = -$qty;

        // Hard block: cannot take more than available
        $warehouseStock = (float) StockMove::query()
            ->where('item_id', $item->id)
            ->where('warehouse_id', $warehouse->id)
            ->sum('quantity');

        if ($qty > $warehouseStock) {
            $unit      = $item->unit ?? 'units';
            $available = max(0, $warehouseStock);
            return response()->json([
                'success' => false,
                'message' => "Insufficient stock. Available in this warehouse: {$available} {$unit}.",
            ], 422);
        }

        $notes = $validated['notes'] ?? null;
        if ($isScrap) {
            $notes = "Scrapped during {$workOrder->code}" . ($notes ? " — {$notes}" : '');
        }

        $move = StockMove::query()->create([
            'company_id'           => $currentCompany->id,
            'item_id'              => $item->id,
            'warehouse_id'         => $warehouse->id,
            'work_order_id'        => $workOrder->id,
            'created_by_member_id' => $currentMember->id,
            'move_type'            => $moveType,
            'quantity'             => $quantity,
            'moved_at'             => now(),
            'notes'                => $notes,
        ]);

        $move->load(['item:id,code,name,unit', 'warehouse:id,code,name', 'createdBy.user:id,name']);

        // Low-stock notification
        if ($item->min_stock !== null) {
            $totalStock = (float) StockMove::query()->where('item_id', $item->id)->sum('quantity');
            if ($totalStock <= (float) $item->min_stock) {
                NotificationService::notifyLowStock($item, $totalStock);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Part recorded successfully.',
            'data'    => ['part' => $this->format($move)],
        ], 201);
    }

    private function format(StockMove $move): array
    {
        return [
            'id'         => $move->id,
            'move_type'  => $move->move_type,
            'quantity'   => (float) $move->quantity,
            'notes'      => $move->notes,
            'item'       => $move->item ? [
                'id'   => $move->item->id,
                'code' => $move->item->code,
                'name' => $move->item->name,
                'unit' => $move->item->unit,
            ] : null,
            'warehouse'  => $move->warehouse ? [
                'id'   => $move->warehouse->id,
                'code' => $move->warehouse->code,
                'name' => $move->warehouse->name,
            ] : null,
            'created_by' => $move->createdBy ? [
                'id'   => $move->createdBy->id,
                'name' => $move->createdBy->user?->name,
            ] : null,
        ];
    }
}
