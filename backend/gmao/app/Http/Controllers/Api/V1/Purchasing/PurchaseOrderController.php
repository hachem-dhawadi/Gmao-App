<?php

namespace App\Http\Controllers\Api\V1\Purchasing;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Receipt;
use App\Models\ReceiptLine;
use App\Models\StockMove;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage       = max(1, min((int) $request->query('per_page', 15), 100));
        $status        = $request->query('status');
        $paymentStatus = $request->query('payment_status');
        $search        = $request->query('search');

        $query = PurchaseOrder::query()
            ->with(['supplier', 'createdBy.user'])
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($paymentStatus && $paymentStatus !== 'all') {
            if ($paymentStatus === 'none') {
                $query->whereNull('payment_status');
            } else {
                $query->where('payment_status', $paymentStatus);
            }
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        $orders = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $this->transformPaginator($orders),
        ]);
    }

    public function show(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $purchaseOrder->load([
            'supplier',
            'createdBy.user',
            'approvedBy.user',
            'lines.item',
            'lines.receiptLines',
            'receipts.lines.purchaseOrderLine.item',
        ]);

        return response()->json([
            'success' => true,
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $validated = $request->validate([
            'supplier_id'          => 'required|integer|exists:suppliers,id',
            'status'               => 'required|in:draft,ordered',
            'supplier_reference'   => 'nullable|string|max:255',
            'expected_delivery_at' => 'nullable|date',
            'supplier_note'        => 'nullable|string|max:3000',
            'lines'                => 'required|array|min:1',
            'lines.*.item_id'      => 'required|integer|exists:items,id',
            'lines.*.qty_ordered'  => 'required|numeric|min:0.001',
            'lines.*.unit_price'   => 'required|numeric|min:0',
        ]);

        $code = $this->generateCode($currentCompany->id);

        $order = DB::transaction(function () use ($validated, $currentCompany, $currentMember, $code) {
            $total = collect($validated['lines'])
                ->sum(fn ($l) => $l['qty_ordered'] * $l['unit_price']);

            $order = PurchaseOrder::query()->create([
                'company_id'           => $currentCompany->id,
                'supplier_id'          => $validated['supplier_id'],
                'code'                 => $code,
                'status'               => $validated['status'],
                'supplier_reference'   => $validated['supplier_reference'] ?? null,
                'expected_delivery_at' => $validated['expected_delivery_at'] ?? null,
                'supplier_note'        => $validated['supplier_note'] ?? null,
                'created_by_member_id' => $currentMember->id,
                'total_amount'         => $total,
                'ordered_at'           => $validated['status'] === 'ordered' ? now() : null,
            ]);

            foreach ($validated['lines'] as $line) {
                $order->lines()->create([
                    'item_id'    => $line['item_id'],
                    'qty_ordered' => $line['qty_ordered'],
                    'unit_price'  => $line['unit_price'],
                ]);
            }

            return $order;
        });

        $order->load(['supplier', 'createdBy.user', 'lines.item', 'lines.receiptLines']);

        return response()->json([
            'success' => true,
            'message' => 'Purchase order created.',
            'data'    => ['purchase_order' => $this->formatFull($order)],
        ], 201);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! in_array($purchaseOrder->status, ['draft', 'ordered'])) {
            return response()->json(['success' => false, 'message' => 'Only draft or ordered POs can be edited.'], 422);
        }

        $isDraft = $purchaseOrder->status === 'draft';

        $rules = [
            'status'               => 'sometimes|in:draft,ordered,cancelled',
            'supplier_reference'   => 'sometimes|nullable|string|max:255',
            'expected_delivery_at' => 'sometimes|nullable|date',
            'supplier_note'        => 'sometimes|nullable|string|max:3000',
        ];

        if ($isDraft) {
            $rules['supplier_id']         = 'sometimes|integer|exists:suppliers,id';
            $rules['lines']               = 'sometimes|array|min:1';
            $rules['lines.*.item_id']     = 'required_with:lines|integer|exists:items,id';
            $rules['lines.*.qty_ordered'] = 'required_with:lines|numeric|min:0.001';
            $rules['lines.*.unit_price']  = 'required_with:lines|numeric|min:0';
        }

        $validated = $request->validate($rules);

        DB::transaction(function () use ($purchaseOrder, $validated, $isDraft) {
            $updateData = [];

            foreach (['status', 'supplier_reference', 'expected_delivery_at', 'supplier_note'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $updateData[$field] = $validated[$field];
                }
            }

            if ($isDraft && array_key_exists('supplier_id', $validated)) {
                $updateData['supplier_id'] = $validated['supplier_id'];
            }

            // Set ordered_at timestamp when transitioning draft → ordered
            if (isset($validated['status']) && $validated['status'] === 'ordered' && $purchaseOrder->status === 'draft') {
                $updateData['ordered_at'] = now();
            }

            // Resync lines (draft only — no receipts exist yet so deletion is safe)
            if ($isDraft && isset($validated['lines'])) {
                $purchaseOrder->lines()->delete();
                $total = 0;
                foreach ($validated['lines'] as $line) {
                    $purchaseOrder->lines()->create([
                        'item_id'     => $line['item_id'],
                        'qty_ordered' => $line['qty_ordered'],
                        'unit_price'  => $line['unit_price'],
                    ]);
                    $total += (float) $line['qty_ordered'] * (float) $line['unit_price'];
                }
                $updateData['total_amount'] = round($total, 2);
            }

            $purchaseOrder->update($updateData);
        });

        $purchaseOrder->load(['supplier', 'createdBy.user', 'lines.item', 'lines.receiptLines']);

        return response()->json([
            'success' => true,
            'message' => 'Purchase order updated.',
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    public function destroy(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($purchaseOrder->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Only draft orders can be deleted.'], 422);
        }

        $purchaseOrder->delete();

        return response()->json(['success' => true, 'message' => 'Purchase order deleted.']);
    }

    // ── Receive ───────────────────────────────────────────────────────────────

    public function receive(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! in_array($purchaseOrder->status, ['ordered', 'partially_received'])) {
            return response()->json(['success' => false, 'message' => 'Only ordered or partially received POs can be received.'], 422);
        }

        $validated = $request->validate([
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'lines'        => 'required|array|min:1',
            'lines.*.purchase_order_line_id' => 'required|integer|exists:purchase_order_lines,id',
            'lines.*.qty_received'           => 'required|numeric|min:0.001',
        ]);

        $warehouse = Warehouse::query()
            ->where('id', $validated['warehouse_id'])
            ->where('company_id', $currentCompany->id)
            ->firstOrFail();

        $purchaseOrder->load('lines.receiptLines');

        DB::transaction(function () use ($purchaseOrder, $validated, $warehouse, $currentMember, $currentCompany) {
            $receipt = Receipt::query()->create([
                'purchase_order_id' => $purchaseOrder->id,
                'received_at'       => now(),
            ]);

            foreach ($validated['lines'] as $lineData) {
                $poLine = $purchaseOrder->lines->firstWhere('id', $lineData['purchase_order_line_id']);

                if (! $poLine) continue;

                $alreadyReceived = $poLine->qtyReceived();
                $remaining       = $poLine->qty_ordered - $alreadyReceived;
                $qty             = min((float) $lineData['qty_received'], $remaining);

                if ($qty <= 0) continue;

                ReceiptLine::query()->create([
                    'receipt_id'              => $receipt->id,
                    'purchase_order_line_id'  => $poLine->id,
                    'qty_received'            => $qty,
                ]);

                // Create stock move to increment inventory
                StockMove::query()->create([
                    'company_id'           => $currentCompany->id,
                    'item_id'              => $poLine->item_id,
                    'warehouse_id'         => $warehouse->id,
                    'supplier_id'          => $purchaseOrder->supplier_id,
                    'created_by_member_id' => $currentMember?->id,
                    'move_type'            => 'purchase_receipt',
                    'quantity'             => $qty,
                    'moved_at'             => now(),
                    'reference'            => $purchaseOrder->code,
                ]);
            }

            // Refresh lines to recalculate received quantities
            $purchaseOrder->load('lines.receiptLines');
            $allReceived = $purchaseOrder->lines->every(
                fn ($l) => $l->qtyReceived() >= (float) $l->qty_ordered
            );

            $purchaseOrder->update([
                'status' => $allReceived ? 'received' : 'partially_received',
            ]);
        });

        $purchaseOrder->load([
            'supplier', 'createdBy.user', 'approvedBy.user',
            'lines.item', 'lines.receiptLines',
            'receipts.lines.purchaseOrderLine.item',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Items received successfully.',
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    // ── Invoice ───────────────────────────────────────────────────────────────

    public function recordInvoice(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! in_array($purchaseOrder->status, ['ordered', 'partially_received', 'received'])) {
            return response()->json(['success' => false, 'message' => 'Invoice can only be recorded on ordered or received POs.'], 422);
        }

        if ($purchaseOrder->payment_status === 'paid') {
            return response()->json(['success' => false, 'message' => 'Cannot modify an invoice that has already been paid.'], 422);
        }

        $validated = $request->validate([
            'invoice_number' => 'required|string|max:100',
            'invoice_date'   => 'required|date',
            'invoice_amount' => 'required|numeric|min:0',
        ]);

        $purchaseOrder->update([
            'invoice_number' => $validated['invoice_number'],
            'invoice_date'   => $validated['invoice_date'],
            'invoice_amount' => $validated['invoice_amount'],
            'payment_status' => 'pending',
        ]);

        $purchaseOrder->load(['supplier', 'createdBy.user', 'lines.item', 'lines.receiptLines']);

        return response()->json([
            'success' => true,
            'message' => 'Invoice recorded.',
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    // ── Pay ───────────────────────────────────────────────────────────────────

    public function markAsPaid(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! in_array($purchaseOrder->payment_status, ['pending', 'disputed'])) {
            return response()->json(['success' => false, 'message' => 'No pending invoice to mark as paid.'], 422);
        }

        $validated = $request->validate([
            'payment_method'    => 'required|in:bank_transfer,paypal,check,cash,credit_card',
            'payment_reference' => 'nullable|string|max:255',
            'payment_note'      => 'nullable|string|max:1000',
            'proof_file'        => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $proofPath = $purchaseOrder->payment_proof_path;
        if ($request->hasFile('proof_file')) {
            if ($proofPath) {
                Storage::disk('local')->delete($proofPath);
            }
            $proofPath = $request->file('proof_file')->store(
                "payment-proofs/{$currentCompany->id}",
                'local'
            );
        }

        $purchaseOrder->update([
            'payment_status'     => 'paid',
            'paid_at'            => now(),
            'payment_method'     => $validated['payment_method'],
            'payment_reference'  => $validated['payment_reference'] ?? null,
            'payment_note'       => $validated['payment_note'] ?? null,
            'payment_proof_path' => $proofPath,
        ]);

        $purchaseOrder->load(['supplier', 'createdBy.user', 'lines.item', 'lines.receiptLines']);

        return response()->json([
            'success' => true,
            'message' => 'Purchase order marked as paid.',
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    // ── Download payment proof ────────────────────────────────────────────────

    public function downloadPaymentProof(Request $request, PurchaseOrder $purchaseOrder): mixed
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! $purchaseOrder->payment_proof_path || ! Storage::disk('local')->exists($purchaseOrder->payment_proof_path)) {
            return response()->json(['success' => false, 'message' => 'No proof file found.'], 404);
        }

        return Storage::disk('local')->download($purchaseOrder->payment_proof_path);
    }

    // ── Dispute ───────────────────────────────────────────────────────────────

    public function disputeInvoice(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($purchaseOrder->payment_status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Only pending invoices can be disputed.'], 422);
        }

        $validated = $request->validate([
            'payment_note' => 'required|string|max:1000',
        ]);

        $purchaseOrder->update([
            'payment_status' => 'disputed',
            'payment_note'   => $validated['payment_note'],
        ]);

        $purchaseOrder->load(['supplier', 'createdBy.user', 'lines.item', 'lines.receiptLines']);

        return response()->json([
            'success' => true,
            'message' => 'Invoice marked as disputed.',
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    // ── Reopen ────────────────────────────────────────────────────────────────

    public function reopen(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $purchaseOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($purchaseOrder->status !== 'cancelled') {
            return response()->json(['success' => false, 'message' => 'Only cancelled POs can be reopened.'], 422);
        }

        $purchaseOrder->update(['status' => 'draft']);

        $purchaseOrder->load([
            'supplier', 'createdBy.user', 'approvedBy.user',
            'lines.item', 'lines.receiptLines',
            'receipts.lines.purchaseOrderLine.item',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Purchase order reopened as draft.',
            'data'    => ['purchase_order' => $this->formatFull($purchaseOrder)],
        ]);
    }

    // ── Receipts list ─────────────────────────────────────────────────────────

    public function receipts(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage   = max(1, min((int) $request->query('per_page', 15), 100));
        $search    = $request->query('search');
        $dateFrom  = $request->query('date_from');
        $dateTo    = $request->query('date_to');
        $minValue  = $request->query('min_value');
        $maxValue  = $request->query('max_value');

        $totalValueSubquery = '(
            SELECT COALESCE(SUM(rl.qty_received * pol.unit_price), 0)
            FROM receipt_lines rl
            JOIN purchase_order_lines pol ON pol.id = rl.purchase_order_line_id
            WHERE rl.receipt_id = receipts.id
        )';

        $query = Receipt::query()
            ->whereHas('purchaseOrder', fn ($q) => $q->where('company_id', $currentCompany->id))
            ->with(['purchaseOrder.supplier', 'lines.purchaseOrderLine.item'])
            ->orderByDesc('received_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('purchaseOrder', function ($pq) use ($search) {
                    $pq->where('code', 'like', "%{$search}%")
                        ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
                });
            });
        }

        if ($dateFrom) {
            $query->whereDate('received_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('received_at', '<=', $dateTo);
        }

        if ($minValue !== null && $minValue !== '') {
            $query->whereRaw("{$totalValueSubquery} >= ?", [(float) $minValue]);
        }

        if ($maxValue !== null && $maxValue !== '') {
            $query->whereRaw("{$totalValueSubquery} <= ?", [(float) $maxValue]);
        }

        $receipts = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => [
                'receipts'   => $receipts->getCollection()->map(fn (Receipt $r) => $this->formatReceipt($r))->values(),
                'pagination' => [
                    'current_page' => $receipts->currentPage(),
                    'per_page'     => $receipts->perPage(),
                    'total'        => $receipts->total(),
                    'last_page'    => $receipts->lastPage(),
                ],
            ],
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function generateCode(int $companyId): string
    {
        $count = PurchaseOrder::query()->where('company_id', $companyId)->withTrashed()->count() + 1;

        return 'PO-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    private function formatLine(PurchaseOrderLine $line): array
    {
        $qtyReceived = $line->qtyReceived();

        return [
            'id'           => $line->id,
            'item'         => $line->item ? ['id' => $line->item->id, 'code' => $line->item->code, 'name' => $line->item->name, 'unit' => $line->item->unit] : null,
            'qty_ordered'  => (float) $line->qty_ordered,
            'qty_received' => $qtyReceived,
            'qty_pending'  => max(0, (float) $line->qty_ordered - $qtyReceived),
            'unit_price'   => (float) $line->unit_price,
            'line_total'   => round((float) $line->qty_ordered * (float) $line->unit_price, 2),
        ];
    }

    private function formatFull(PurchaseOrder $order): array
    {
        return [
            'id'                   => $order->id,
            'code'                 => $order->code,
            'status'               => $order->status,
            'supplier_reference'   => $order->supplier_reference,
            'supplier_note'        => $order->supplier_note,
            'total_amount'         => (float) $order->total_amount,
            'ordered_at'           => $order->ordered_at?->toISOString(),
            'expected_delivery_at' => $order->expected_delivery_at?->toISOString(),
            'created_at'           => $order->created_at?->toISOString(),
            'supplier'             => $order->supplier ? [
                'id'           => $order->supplier->id,
                'name'         => $order->supplier->name,
                'email'        => $order->supplier->email,
                'phone'        => $order->supplier->phone,
                'contact_name' => $order->supplier->contact_name,
                'address'      => $order->supplier->address,
            ] : null,
            'created_by'           => $order->createdBy ? ['id' => $order->createdBy->id, 'name' => $order->createdBy->user?->name] : null,
            'approved_by'          => $order->approvedBy ? ['id' => $order->approvedBy->id, 'name' => $order->approvedBy->user?->name] : null,
            'lines'                => $order->lines->map(fn ($l) => $this->formatLine($l))->values()->all(),
            'receipts_count'       => $order->receipts->count(),
            'invoice_number'       => $order->invoice_number,
            'invoice_date'         => $order->invoice_date?->toDateString(),
            'invoice_amount'       => $order->invoice_amount !== null ? (float) $order->invoice_amount : null,
            'payment_status'       => $order->payment_status,
            'paid_at'              => $order->paid_at?->toISOString(),
            'payment_method'       => $order->payment_method,
            'payment_reference'    => $order->payment_reference,
            'payment_note'         => $order->payment_note,
            'has_payment_proof'    => (bool) $order->payment_proof_path,
        ];
    }

    private function formatReceipt(Receipt $receipt): array
    {
        return [
            'id'          => $receipt->id,
            'received_at' => $receipt->received_at?->toISOString(),
            'po_code'     => $receipt->purchaseOrder?->code,
            'po_id'       => $receipt->purchaseOrder?->id,
            'supplier'    => $receipt->purchaseOrder?->supplier?->name,
            'lines'       => $receipt->lines->map(fn (ReceiptLine $rl) => [
                'item'         => $rl->purchaseOrderLine?->item ? [
                    'id'   => $rl->purchaseOrderLine->item->id,
                    'name' => $rl->purchaseOrderLine->item->name,
                    'code' => $rl->purchaseOrderLine->item->code,
                ] : null,
                'qty_received' => (float) $rl->qty_received,
                'unit_price'   => (float) ($rl->purchaseOrderLine?->unit_price ?? 0),
            ])->values()->all(),
        ];
    }

    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'purchase_orders' => $paginator->getCollection()
                ->map(fn (PurchaseOrder $o) => [
                    'id'                   => $o->id,
                    'code'                 => $o->code,
                    'status'               => $o->status,
                    'payment_status'       => $o->payment_status,
                    'total_amount'         => (float) $o->total_amount,
                    'ordered_at'           => $o->ordered_at?->toISOString(),
                    'expected_delivery_at' => $o->expected_delivery_at?->toISOString(),
                    'created_at'           => $o->created_at?->toISOString(),
                    'supplier'             => $o->supplier ? ['id' => $o->supplier->id, 'name' => $o->supplier->name] : null,
                    'created_by'           => $o->createdBy ? ['id' => $o->createdBy->id, 'name' => $o->createdBy->user?->name] : null,
                ])
                ->values()
                ->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ];
    }
}
