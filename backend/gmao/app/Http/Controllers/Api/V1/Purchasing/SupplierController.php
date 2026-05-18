<?php

namespace App\Http\Controllers\Api\V1\Purchasing;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage   = max(1, min((int) $request->query('per_page', 15), 100));
        $search    = $request->query('search');
        $hasEmail  = $request->query('has_email');
        $hasPhone  = $request->query('has_phone');

        $query = Supplier::query()
            ->where('company_id', $currentCompany->id)
            ->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%");
            });
        }

        if ($hasEmail === 'yes') {
            $query->whereNotNull('email')->where('email', '!=', '');
        } elseif ($hasEmail === 'no') {
            $query->where(function ($q) { $q->whereNull('email')->orWhere('email', ''); });
        }

        if ($hasPhone === 'yes') {
            $query->whereNotNull('phone')->where('phone', '!=', '');
        } elseif ($hasPhone === 'no') {
            $query->where(function ($q) { $q->whereNull('phone')->orWhere('phone', ''); });
        }

        $suppliers = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => [
                'suppliers'  => $suppliers->getCollection()->map(fn (Supplier $s) => $this->format($s))->values(),
                'pagination' => [
                    'current_page' => $suppliers->currentPage(),
                    'per_page'     => $suppliers->perPage(),
                    'total'        => $suppliers->total(),
                    'last_page'    => $suppliers->lastPage(),
                ],
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
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255',
            'phone'        => 'nullable|string|max:50',
            'address'      => 'nullable|string|max:1000',
            'contact_name' => 'nullable|string|max:255',
            'tax_number'   => 'nullable|string|max:100',
        ]);

        $supplier = Supplier::query()->create([
            'company_id' => $currentCompany->id,
            ...$validated,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Supplier created successfully.',
            'data'    => ['supplier' => $this->format($supplier)],
        ], 201);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $supplier->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'email'        => 'sometimes|nullable|email|max:255',
            'phone'        => 'sometimes|nullable|string|max:50',
            'address'      => 'sometimes|nullable|string|max:1000',
            'contact_name' => 'sometimes|nullable|string|max:255',
            'tax_number'   => 'sometimes|nullable|string|max:100',
        ]);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully.',
            'data'    => ['supplier' => $this->format($supplier)],
        ]);
    }

    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $supplier->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($supplier->purchaseOrders()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete supplier with existing purchase orders.',
            ], 422);
        }

        $supplier->delete();

        return response()->json(['success' => true, 'message' => 'Supplier deleted.']);
    }

    private function format(Supplier $s): array
    {
        return [
            'id'           => $s->id,
            'name'         => $s->name,
            'email'        => $s->email,
            'phone'        => $s->phone,
            'address'      => $s->address,
            'contact_name' => $s->contact_name,
            'tax_number'   => $s->tax_number,
            'created_at'   => $s->created_at?->toISOString(),
        ];
    }
}
