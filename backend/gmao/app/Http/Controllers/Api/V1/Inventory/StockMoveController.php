<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\StockMove;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockMoveController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage     = max(1, min((int) $request->query('per_page', 20), 100));
        $itemId      = $request->query('item_id');
        $warehouseId = $request->query('warehouse_id');
        $moveType    = $request->query('move_type');

        $query = StockMove::query()
            ->where('company_id', $currentCompany->id)
            ->with([
                'item:id,code,name,unit',
                'warehouse:id,code,name',
                'createdBy.user:id,name',
            ])
            ->orderByDesc('moved_at')
            ->orderByDesc('id');

        if ($itemId) {
            $query->where('item_id', $itemId);
        }

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($moveType) {
            $query->where('move_type', $moveType);
        }

        $moves = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Stock moves retrieved successfully.',
            'data'    => [
                'stock_moves' => $moves->getCollection()->map(fn ($m) => $this->format($m))->values()->all(),
                'pagination'  => [
                    'current_page' => $moves->currentPage(),
                    'per_page'     => $moves->perPage(),
                    'total'        => $moves->total(),
                    'last_page'    => $moves->lastPage(),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $validated = $request->validate([
            'item_id'       => 'required|integer|exists:items,id',
            'warehouse_id'  => 'required|integer|exists:warehouses,id',
            'work_order_id' => 'nullable|integer|exists:work_orders,id',
            'move_type'     => 'required|in:in,out,adjustment',
            'quantity'      => 'required|numeric|not_in:0',
            'moved_at'      => 'nullable|date',
            'reference'     => 'nullable|string|max:255',
            'notes'         => 'nullable|string|max:2000',
        ]);

        // Ensure item belongs to current company
        $item = \App\Models\Item::find($validated['item_id']);
        if (! $item || (int) $item->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Item not found.'], 404);
        }
        if (! $item->is_stocked) {
            return response()->json([
                'success' => false,
                'message' => 'This item is not tracked in stock. Enable stock tracking on the item first.',
            ], 422);
        }

        // Ensure warehouse belongs to current company
        $warehouse = \App\Models\Warehouse::find($validated['warehouse_id']);
        if (! $warehouse || (int) $warehouse->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Warehouse not found.'], 404);
        }

        // Ensure work order (if provided) belongs to current company
        if (! empty($validated['work_order_id'])) {
            $workOrder = \App\Models\WorkOrder::find($validated['work_order_id']);
            if (! $workOrder || (int) $workOrder->company_id !== (int) $currentCompany->id) {
                return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
            }
        }

        // For 'out' moves, quantity is stored as negative
        $quantity = (float) $validated['quantity'];
        if ($validated['move_type'] === 'out' && $quantity > 0) {
            $quantity = -$quantity;
        }

        $move = StockMove::query()->create([
            'company_id'           => $currentCompany->id,
            'item_id'              => $validated['item_id'],
            'warehouse_id'         => $validated['warehouse_id'],
            'work_order_id'        => $validated['work_order_id'] ?? null,
            'created_by_member_id' => $currentMember->id,
            'move_type'            => $validated['move_type'],
            'quantity'             => $quantity,
            'moved_at'             => $validated['moved_at'] ?? now(),
            'reference'            => $validated['reference'] ?? null,
            'notes'                => $validated['notes'] ?? null,
        ]);

        $move->load([
            'item:id,code,name,unit',
            'warehouse:id,code,name',
            'createdBy.user:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Stock move recorded successfully.',
            'data'    => ['stock_move' => $this->format($move)],
        ], 201);
    }

    public function destroy(Request $request, StockMove $stockMove): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || (int) $stockMove->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $isAdmin = $currentMember?->roles()->where('code', 'admin')->exists() ?? false;

        if (! $isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Only administrators can delete stock moves.',
            ], 403);
        }

        $stockMove->delete();

        return response()->json(['success' => true, 'message' => 'Stock move deleted.']);
    }

    private function format(StockMove $move): array
    {
        return [
            'id'             => $move->id,
            'company_id'     => $move->company_id,
            'item_id'        => $move->item_id,
            'warehouse_id'   => $move->warehouse_id,
            'work_order_id'  => $move->work_order_id,
            'move_type'      => $move->move_type,
            'quantity'     => (float) $move->quantity,
            'moved_at'     => $move->moved_at?->toISOString(),
            'reference'    => $move->reference,
            'notes'        => $move->notes,
            'item'         => $move->relationLoaded('item') && $move->item ? [
                'id'   => $move->item->id,
                'code' => $move->item->code,
                'name' => $move->item->name,
                'unit' => $move->item->unit,
            ] : null,
            'warehouse'    => $move->relationLoaded('warehouse') && $move->warehouse ? [
                'id'   => $move->warehouse->id,
                'code' => $move->warehouse->code,
                'name' => $move->warehouse->name,
            ] : null,
            'created_by'   => $move->relationLoaded('createdBy') && $move->createdBy ? [
                'id'   => $move->createdBy->id,
                'name' => $move->createdBy->user?->name,
            ] : null,
        ];
    }
}
