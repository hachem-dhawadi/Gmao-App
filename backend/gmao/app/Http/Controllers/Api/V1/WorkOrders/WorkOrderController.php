<?php

namespace App\Http\Controllers\Api\V1\WorkOrders;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\WorkOrders\StoreWorkOrderRequest;
use App\Http\Requests\Api\V1\WorkOrders\UpdateWorkOrderRequest;
use App\Http\Resources\Api\V1\WorkOrders\WorkOrderResource;
use App\Models\WorkOrder;
use App\Models\WorkOrderAttachment;
use App\Models\WorkOrderComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WorkOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage  = max(1, min((int) $request->query('per_page', 15), 100));
        $status   = $request->query('status');
        $priority = $request->query('priority');
        $search   = $request->query('search');

        $query = WorkOrder::query()
            ->with(['asset', 'createdBy.user', 'assignedMembers.user'])
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($priority && $priority !== 'all') {
            $query->where('priority', $priority);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $workOrders = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Work orders retrieved successfully.',
            'data'    => $this->transformPaginator($workOrders),
        ]);
    }

    public function show(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
        }

        $workOrder->load(['asset', 'createdBy.user', 'closedBy.user', 'assignedMembers.user', 'statusHistory.changedBy.user', 'comments.member.user', 'attachments.member.user', 'workLogs.member.user']);

        return response()->json([
            'success' => true,
            'message' => 'Work order retrieved successfully.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ]);
    }

    public function store(StoreWorkOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $code = $validated['code'] ?? $this->generateCode($currentCompany->id);

        if (WorkOrder::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $code)
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Work order code already exists.'], 422);
        }

        $workOrder = WorkOrder::query()->create([
            'company_id'           => $currentCompany->id,
            'asset_id'             => $validated['asset_id'],
            'code'                 => $code,
            'created_by_member_id' => $currentMember->id,
            'status'               => $validated['status'],
            'priority'             => $validated['priority'],
            'title'                => $validated['title'],
            'description'          => $validated['description'] ?? null,
            'due_at'               => $validated['due_at'] ?? null,
            'estimated_minutes'    => $validated['estimated_minutes'] ?? null,
            'opened_at'            => now(),
        ]);

        if (! empty($validated['assigned_member_ids'])) {
            $syncData = collect($validated['assigned_member_ids'])
                ->mapWithKeys(fn ($id) => [$id => ['assigned_at' => now()]])
                ->all();
            $workOrder->assignedMembers()->sync($syncData);
        }

        $workOrder->load(['asset', 'createdBy.user', 'assignedMembers.user']);

        return response()->json([
            'success' => true,
            'message' => 'Work order created successfully.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ], 201);
    }

    public function update(UpdateWorkOrderRequest $request, WorkOrder $workOrder): JsonResponse
    {
        $validated = $request->validated();
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
        }

        $assignedMemberIds = $validated['assigned_member_ids'] ?? null;
        unset($validated['assigned_member_ids']);

        // Only Admin / Manager (work_orders.assign) may change assigned members
        if ($assignedMemberIds !== null && $currentMember) {
            $canAssign = $currentMember->roles()
                ->whereHas('permissions', fn ($q) => $q->where('code', 'work_orders.assign'))
                ->exists();

            if (! $canAssign) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to assign members to work orders.',
                ], 403);
            }
        }

        $oldStatus = $workOrder->status;

        if (! empty($validated)) {
            // Auto-set closed_at when completing/cancelling
            if (isset($validated['status']) && in_array($validated['status'], ['completed', 'cancelled'])) {
                $validated['closed_at']            = now();
                $validated['closed_by_member_id']  = $currentMember?->id;
            }

            $workOrder->forceFill($validated)->save();
        }

        // Record status change
        if (isset($validated['status']) && $validated['status'] !== $oldStatus && $currentMember) {
            $workOrder->statusHistory()->create([
                'changed_by_member_id' => $currentMember->id,
                'old_status'           => $oldStatus,
                'new_status'           => $validated['status'],
                'changed_at'           => now(),
            ]);
        }

        if ($assignedMemberIds !== null) {
            $syncData = collect($assignedMemberIds)
                ->mapWithKeys(fn ($id) => [$id => ['assigned_at' => now()]])
                ->all();
            $workOrder->assignedMembers()->sync($syncData);
        }

        $workOrder->load(['asset', 'createdBy.user', 'assignedMembers.user']);

        return response()->json([
            'success' => true,
            'message' => 'Work order updated successfully.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ]);
    }

    public function destroy(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
        }

        $workOrder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Work order deleted successfully.',
        ]);
    }

    // ── Comments ─────────────────────────────────────────────────────────────

    public function addComment(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $request->validate(['body' => 'required|string|max:3000']);

        $comment = $workOrder->comments()->create([
            'member_id' => $currentMember->id,
            'body'      => $request->body,
        ]);

        $comment->load('member.user');

        return response()->json([
            'success' => true,
            'data'    => [
                'id'         => $comment->id,
                'body'       => $comment->body,
                'author'     => $comment->member?->user?->name ?? 'Unknown',
                'created_at' => $comment->created_at?->toISOString(),
            ],
        ], 201);
    }

    public function deleteComment(Request $request, WorkOrder $workOrder, WorkOrderComment $comment): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $comment->delete();

        return response()->json(['success' => true, 'message' => 'Comment deleted.']);
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    public function addAttachment(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $request->validate(['file' => 'required|file|max:20480']);

        $file       = $request->file('file');
        $storedPath = $file->store("work-orders/{$workOrder->id}/attachments", 'public');

        $attachment = $workOrder->attachments()->create([
            'member_id'     => $currentMember->id,
            'original_name' => $file->getClientOriginalName(),
            'stored_path'   => $storedPath,
            'mime_type'     => $file->getMimeType(),
            'size_bytes'    => $file->getSize(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'            => $attachment->id,
                'original_name' => $attachment->original_name,
                'size_bytes'    => $attachment->size_bytes,
                'mime_type'     => $attachment->mime_type,
                'url'           => url(Storage::url($attachment->stored_path)),
                'created_at'    => $attachment->created_at?->toISOString(),
            ],
        ], 201);
    }

    public function downloadAttachment(Request $request, WorkOrder $workOrder, WorkOrderAttachment $attachment)
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $workOrder->company_id !== (int) $currentCompany->id) {
            abort(404);
        }

        if (! Storage::exists($attachment->stored_path)) {
            abort(404, 'File not found.');
        }

        return Storage::download($attachment->stored_path, $attachment->original_name);
    }

    public function deleteAttachment(Request $request, WorkOrder $workOrder, WorkOrderAttachment $attachment): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        Storage::disk('public')->delete($attachment->stored_path);
        $attachment->delete();

        return response()->json(['success' => true, 'message' => 'Attachment deleted.']);
    }

    private function generateCode(int $companyId): string
    {
        $count = WorkOrder::query()->where('company_id', $companyId)->withTrashed()->count() + 1;

        return 'WO-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @return array{work_orders: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        $workOrders = $paginator->getCollection()
            ->map(fn (WorkOrder $wo): array => WorkOrderResource::make($wo)->resolve())
            ->values()
            ->all();

        return [
            'work_orders' => $workOrders,
            'pagination'  => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ];
    }
}
