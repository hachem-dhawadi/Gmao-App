<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\StockMove;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));
        $search  = $request->query('search');

        $query = Warehouse::query()
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $warehouses = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Warehouses retrieved successfully.',
            'data'    => [
                'warehouses' => $warehouses->getCollection()->map(fn ($w) => $this->format($w))->values()->all(),
                'pagination' => [
                    'current_page' => $warehouses->currentPage(),
                    'per_page'     => $warehouses->perPage(),
                    'total'        => $warehouses->total(),
                    'last_page'    => $warehouses->lastPage(),
                ],
            ],
        ]);
    }

    public function show(Request $request, Warehouse $warehouse): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $warehouse->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Warehouse not found.'], 404);
        }

        $stockByItem = StockMove::query()
            ->where('warehouse_id', $warehouse->id)
            ->select('item_id', DB::raw('SUM(quantity) as stock_qty'))
            ->groupBy('item_id')
            ->with('item:id,code,name,unit,min_stock')
            ->get()
            ->map(fn ($m) => [
                'item_id'   => $m->item_id,
                'item_code' => $m->item?->code,
                'item_name' => $m->item?->name,
                'unit'      => $m->item?->unit,
                'min_stock' => $m->item?->min_stock !== null ? (float) $m->item->min_stock : null,
                'stock_qty' => (float) $m->stock_qty,
            ])
            ->filter(fn ($s) => $s['stock_qty'] != 0)
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Warehouse retrieved successfully.',
            'data'    => [
                'warehouse'    => $this->format($warehouse),
                'stock_by_item' => $stockByItem,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $validated = $request->validate([
            'code'     => 'required|string|max:100',
            'name'     => 'required|string|max:255',
            'location' => 'nullable|string|max:500',
        ]);

        if (Warehouse::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Warehouse code already exists in this company.'], 422);
        }

        $warehouse = Warehouse::query()->create([
            'company_id' => $currentCompany->id,
            'code'       => $validated['code'],
            'name'       => $validated['name'],
            'location'   => $validated['location'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Warehouse created successfully.',
            'data'    => ['warehouse' => $this->format($warehouse)],
        ], 201);
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $warehouse->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Warehouse not found.'], 404);
        }

        $validated = $request->validate([
            'code'     => 'sometimes|string|max:100',
            'name'     => 'sometimes|string|max:255',
            'location' => 'nullable|string|max:500',
        ]);

        if (array_key_exists('code', $validated) &&
            Warehouse::query()
                ->where('company_id', $currentCompany->id)
                ->where('code', $validated['code'])
                ->where('id', '!=', $warehouse->id)
                ->exists()) {
            return response()->json(['success' => false, 'message' => 'Warehouse code already exists in this company.'], 422);
        }

        $warehouse->forceFill($validated)->save();

        return response()->json([
            'success' => true,
            'message' => 'Warehouse updated successfully.',
            'data'    => ['warehouse' => $this->format($warehouse)],
        ]);
    }

    public function destroy(Request $request, Warehouse $warehouse): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || (int) $warehouse->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Warehouse not found.'], 404);
        }

        $isAdmin = $currentMember?->roles()->where('code', 'admin')->exists() ?? false;

        if (! $isAdmin) {
            return response()->json(['success' => false, 'message' => 'Only administrators can delete warehouses.'], 403);
        }

        $warehouse->delete();

        return response()->json(['success' => true, 'message' => 'Warehouse deleted successfully.']);
    }

    private function format(Warehouse $warehouse): array
    {
        return [
            'id'         => $warehouse->id,
            'company_id' => $warehouse->company_id,
            'code'       => $warehouse->code,
            'name'       => $warehouse->name,
            'location'   => $warehouse->location,
            'created_at' => $warehouse->created_at?->toISOString(),
            'updated_at' => $warehouse->updated_at?->toISOString(),
        ];
    }
}
