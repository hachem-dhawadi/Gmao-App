<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\StockMove;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));
        $search  = $request->query('search');

        $minCost      = $request->query('min_cost');
        $maxCost      = $request->query('max_cost');
        $stockedOnly  = filter_var($request->query('stocked_only', false), FILTER_VALIDATE_BOOLEAN);
        $lowStockOnly = filter_var($request->query('low_stock_only', false), FILTER_VALIDATE_BOOLEAN);

        $query = Item::query()
            ->where('company_id', $currentCompany->id)
            ->withSum('stockMoves as total_stock', 'quantity')
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($minCost !== null && $minCost !== '') {
            $query->where('unit_cost', '>=', (float) $minCost);
        }

        if ($maxCost !== null && $maxCost !== '') {
            $query->where('unit_cost', '<=', (float) $maxCost);
        }

        if ($stockedOnly) {
            $query->where('is_stocked', true);
        }

        $items = $query->paginate($perPage);

        if ($lowStockOnly) {
            $filtered = $items->getCollection()->filter(function ($i) {
                $stock = (float) ($i->total_stock ?? 0);
                return $i->min_stock !== null && $stock <= (float) $i->min_stock;
            });
            $items->setCollection($filtered->values());
        }

        return response()->json([
            'success' => true,
            'message' => 'Items retrieved successfully.',
            'data'    => [
                'items'      => $items->getCollection()->map(fn ($i) => $this->formatItem($i))->values()->all(),
                'pagination' => [
                    'current_page' => $items->currentPage(),
                    'per_page'     => $items->perPage(),
                    'total'        => $items->total(),
                    'last_page'    => $items->lastPage(),
                ],
            ],
        ]);
    }

    public function show(Request $request, Item $item): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $item->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Item not found.'], 404);
        }

        $stockByWarehouse = StockMove::query()
            ->where('item_id', $item->id)
            ->select('warehouse_id', DB::raw('SUM(quantity) as stock_qty'))
            ->groupBy('warehouse_id')
            ->with('warehouse:id,code,name')
            ->get()
            ->map(fn ($m) => [
                'warehouse_id'   => $m->warehouse_id,
                'warehouse_code' => $m->warehouse?->code,
                'warehouse_name' => $m->warehouse?->name,
                'stock_qty'      => (float) $m->stock_qty,
            ])
            ->values()
            ->all();

        $totalStock = array_sum(array_column($stockByWarehouse, 'stock_qty'));

        return response()->json([
            'success' => true,
            'message' => 'Item retrieved successfully.',
            'data'    => [
                'item'               => $this->formatItemDetail($item, $totalStock),
                'stock_by_warehouse' => $stockByWarehouse,
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
            'code'        => 'required|string|max:100',
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'barcode'     => 'nullable|string|max:100',
            'unit'        => 'nullable|string|max:50',
            'unit_cost'   => 'nullable|numeric|min:0',
            'min_stock'   => 'nullable|numeric|min:0',
            'is_stocked'  => 'nullable|boolean',
            'images'      => 'nullable|array',
            'images.*'    => 'image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if (Item::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $validated['code'])
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Item code already exists in this company.'], 422);
        }

        $imagePaths = $this->storeImages($request);

        $item = Item::query()->create([
            'company_id'  => $currentCompany->id,
            'code'        => $validated['code'],
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
            'barcode'     => $validated['barcode'] ?? null,
            'unit'        => $validated['unit'] ?? null,
            'unit_cost'   => $validated['unit_cost'] ?? null,
            'min_stock'   => $validated['min_stock'] ?? null,
            'is_stocked'  => filter_var($request->input('is_stocked', true), FILTER_VALIDATE_BOOLEAN),
            'images'      => $imagePaths ?: null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully.',
            'data'    => ['item' => $this->formatItemDetail($item, 0)],
        ], 201);
    }

    public function update(Request $request, Item $item): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $item->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Item not found.'], 404);
        }

        $validated = $request->validate([
            'code'              => 'sometimes|string|max:100',
            'name'              => 'sometimes|string|max:255',
            'description'       => 'nullable|string|max:2000',
            'barcode'           => 'nullable|string|max:100',
            'unit'              => 'nullable|string|max:50',
            'unit_cost'         => 'nullable|numeric|min:0',
            'min_stock'         => 'nullable|numeric|min:0',
            'is_stocked'        => 'nullable|boolean',
            'images'            => 'nullable|array',
            'images.*'          => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            'existing_images'   => 'nullable|array',
            'existing_images.*' => 'nullable|string',
        ]);

        if (isset($validated['code']) &&
            Item::query()
                ->where('company_id', $currentCompany->id)
                ->where('code', $validated['code'])
                ->where('id', '!=', $item->id)
                ->exists()) {
            return response()->json(['success' => false, 'message' => 'Item code already exists in this company.'], 422);
        }

        // Handle images: keep existing, delete removed, store new.
        // Frontend sends existing images as pathnames (/storage/items/xxx.jpg)
        // while the DB stores full URLs — compare by storage path to avoid mismatch.
        $oldImages = $item->images ?? [];

        if ($request->has('has_images_field')) {
            $submittedPaths = collect($request->input('existing_images', []))
                ->map(fn (string $raw) => $this->resolveStoragePath($raw))
                ->filter()
                ->values()
                ->all();

            foreach ($oldImages as $url) {
                $path = $this->urlToStoragePath($url);
                if ($path && ! in_array($path, $submittedPaths, true)) {
                    Storage::disk('public')->delete($path);
                }
            }

            $keptUrls = collect($oldImages)->filter(function (string $url) use ($submittedPaths): bool {
                $path = $this->urlToStoragePath($url);
                return $path !== null && in_array($path, $submittedPaths, true);
            })->values()->all();
        } else {
            $keptUrls = $oldImages;
        }

        // Store newly uploaded images
        $newPaths    = $this->storeImages($request);
        $finalImages = array_values(array_merge($keptUrls, $newPaths));

        $item->forceFill([
            'code'        => $validated['code']        ?? $item->code,
            'name'        => $validated['name']        ?? $item->name,
            'description' => $validated['description'] ?? null,
            'barcode'     => $validated['barcode']     ?? null,
            'unit'        => $validated['unit']        ?? null,
            'unit_cost'   => $validated['unit_cost']   ?? null,
            'min_stock'   => $validated['min_stock']   ?? null,
            'is_stocked'  => filter_var($request->input('is_stocked', $item->is_stocked), FILTER_VALIDATE_BOOLEAN),
            'images'      => $finalImages ?: null,
        ])->save();
        $item->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully.',
            'data'    => ['item' => $this->formatItemDetail($item, null)],
        ]);
    }

    public function destroy(Request $request, Item $item): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || (int) $item->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Item not found.'], 404);
        }

        $isAdmin = $currentMember?->roles()->where('code', 'admin')->exists() ?? false;

        if (! $isAdmin) {
            return response()->json(['success' => false, 'message' => 'Only administrators can delete items.'], 403);
        }

        if ($item->stockMoves()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this item — it has stock movement history. Deactivate it instead.',
            ], 422);
        }

        // Remove stored images from disk
        foreach ($item->images ?? [] as $url) {
            $path = $this->urlToStoragePath($url);
            if ($path) {
                Storage::disk('public')->delete($path);
            }
        }

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item deleted successfully.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function storeImages(Request $request): array
    {
        $urls = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path  = $file->store('items', 'public');
                $urls[] = url(Storage::url($path));
            }
        }
        return $urls;
    }

    private function resolveStoragePath(string $raw): ?string
    {
        if (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')) {
            return $this->urlToStoragePath($raw);
        }
        $prefix = '/storage/';
        return str_starts_with($raw, $prefix) ? substr($raw, strlen($prefix)) : null;
    }

    private function urlToStoragePath(string $url): ?string
    {
        $parsed = parse_url($url, PHP_URL_PATH);
        if (! $parsed) {
            return null;
        }
        $prefix = '/storage/';
        if (str_starts_with($parsed, $prefix)) {
            return substr($parsed, strlen($prefix));
        }
        return null;
    }

    private function formatItem($item): array
    {
        return [
            'id'          => $item->id,
            'company_id'  => $item->company_id,
            'code'        => $item->code,
            'name'        => $item->name,
            'description' => $item->description,
            'barcode'     => $item->barcode,
            'unit'        => $item->unit,
            'unit_cost'   => $item->unit_cost !== null ? (float) $item->unit_cost : null,
            'min_stock'   => $item->min_stock !== null ? (float) $item->min_stock : null,
            'is_stocked'  => (bool) $item->is_stocked,
            'images'      => $item->images ?? [],
            'total_stock' => $item->total_stock !== null ? (float) $item->total_stock : 0.0,
            'created_at'  => $item->created_at?->toISOString(),
            'updated_at'  => $item->updated_at?->toISOString(),
        ];
    }

    private function formatItemDetail(Item $item, ?float $totalStock): array
    {
        return [
            'id'          => $item->id,
            'company_id'  => $item->company_id,
            'code'        => $item->code,
            'name'        => $item->name,
            'description' => $item->description,
            'barcode'     => $item->barcode,
            'unit'        => $item->unit,
            'unit_cost'   => $item->unit_cost !== null ? (float) $item->unit_cost : null,
            'min_stock'   => $item->min_stock !== null ? (float) $item->min_stock : null,
            'is_stocked'  => (bool) $item->is_stocked,
            'images'      => $item->images ?? [],
            'total_stock' => $totalStock,
            'created_at'  => $item->created_at?->toISOString(),
            'updated_at'  => $item->updated_at?->toISOString(),
        ];
    }
}
