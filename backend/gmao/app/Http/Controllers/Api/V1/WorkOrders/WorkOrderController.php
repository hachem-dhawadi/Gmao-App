<?php

namespace App\Http\Controllers\Api\V1\WorkOrders;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\WorkOrders\StoreWorkOrderRequest;
use App\Http\Requests\Api\V1\WorkOrders\UpdateWorkOrderRequest;
use App\Http\Resources\Api\V1\WorkOrders\WorkOrderResource;
use App\Models\WorkOrder;
use App\Models\WorkOrderAttachment;
use App\Models\WorkOrderComment;
use App\Services\NotificationService;
use App\Services\WorkOrderActivityService;
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

        $currentMember = $request->attributes->get('currentMember');

        $perPage      = max(1, min((int) $request->query('per_page', 15), 100));
        $status       = $request->query('status');
        $priority     = $request->query('priority');
        $search       = $request->query('search');
        $myOnly       = $request->boolean('my_only');
        $assetId      = $request->query('asset_id');
        $siteId       = $request->query('site_id');
        $showArchived = $request->boolean('archived');

        $with = ['asset', 'site', 'team', 'createdBy.user', 'assignedMember.user'];
        if ($assetId) {
            $with[] = 'workLogs';
        }

        $query = WorkOrder::query()
            ->with($with)
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id');

        if ($showArchived) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        if ($assetId) {
            $query->where('asset_id', $assetId);
        }

        if ($siteId) {
            $query->where('site_id', (int) $siteId);
        }

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

        if ($myOnly && $currentMember) {
            $query->where('assigned_member_id', $currentMember->id);
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

        $workOrder->load(['asset', 'createdBy.user', 'closedBy.user', 'assignedMember.user', 'statusHistory.changedBy.user', 'comments.member.user', 'attachments.member.user', 'workLogs.member.user', 'checklistItems.completedBy.user']);

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

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();

        // Admin/manager: use submitted status (default open); others: always pending_approval
        $initialStatus         = $isAdminOrManager ? ($validated['status'] ?? 'open') : 'pending_approval';
        $approvedByMemberId    = $isAdminOrManager ? $currentMember->id : null;
        $approvedAt            = $isAdminOrManager ? now() : null;

        $code = $validated['code'] ?? $this->generateCode($currentCompany->id);

        if (WorkOrder::query()
            ->where('company_id', $currentCompany->id)
            ->where('code', $code)
            ->exists()) {
            return response()->json(['success' => false, 'message' => 'Work order code already exists.'], 422);
        }

        $asset = \App\Models\Asset::find($validated['asset_id']);

        $workOrder = WorkOrder::query()->create([
            'company_id'            => $currentCompany->id,
            'asset_id'              => $validated['asset_id'],
            'site_id'               => $asset?->site_id,
            'team_id'               => $validated['team_id'] ?? null,
            'code'                  => $code,
            'created_by_member_id'  => $currentMember->id,
            'status'                => $initialStatus,
            'priority'              => $validated['priority'],
            'title'                 => $validated['title'],
            'description'           => $validated['description'] ?? null,
            'due_at'                => $validated['due_at'] ?? null,
            'estimated_minutes'     => $validated['estimated_minutes'] ?? null,
            'opened_at'             => now(),
            'approved_by_member_id' => $approvedByMemberId,
            'approved_at'           => $approvedAt,
        ]);

        if (! empty($validated['assigned_member_id'])) {
            $workOrder->update(['assigned_member_id' => $validated['assigned_member_id']]);
            NotificationService::notifyWoAssigned($workOrder, [$validated['assigned_member_id']], $currentMember->id);
        }

        // Notify approvers when WO needs approval
        if ($initialStatus === 'pending_approval') {
            $siteId = $asset?->site_id;

            // Prefer managers who work at the same site
            $approvers = \App\Models\Member::query()
                ->where('company_id', $currentCompany->id)
                ->whereHas('roles', fn ($q) => $q->where('code', 'manager'))
                ->when($siteId, fn ($q) => $q->whereHas('sites', fn ($sq) => $sq->where('sites.id', $siteId)))
                ->get();

            // Fallback: any admin in the company
            if ($approvers->isEmpty()) {
                $approvers = \App\Models\Member::query()
                    ->where('company_id', $currentCompany->id)
                    ->whereHas('roles', fn ($q) => $q->where('code', 'admin'))
                    ->get();
            }

            if ($approvers->isNotEmpty()) {
                NotificationService::notifyWoPendingApproval($workOrder, $approvers->pluck('id')->all(), $currentMember->id);
            }
        }

        $workOrder->load(['asset', 'site', 'team', 'createdBy.user', 'assignedMember.user']);

        return response()->json([
            'success' => true,
            'message' => $initialStatus === 'pending_approval'
                ? 'Work order submitted and awaiting manager approval.'
                : 'Work order created successfully.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ], 201);
    }

    public function approve(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($workOrder->status !== 'pending_approval') {
            return response()->json(['success' => false, 'message' => 'This work order is not pending approval.'], 422);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager) {
            return response()->json(['success' => false, 'message' => 'Only managers and admins can approve work orders.'], 403);
        }

        $oldStatus = $workOrder->status;

        $workOrder->update([
            'status'                => 'open',
            'approved_by_member_id' => $currentMember->id,
            'approved_at'           => now(),
        ]);

        $workOrder->statusHistory()->create([
            'changed_by_member_id' => $currentMember->id,
            'old_status'           => $oldStatus,
            'new_status'           => 'open',
            'changed_at'           => now(),
        ]);

        // Auto-assign the creator if no assignee is set yet
        $creatorId = $workOrder->created_by_member_id;
        if (! $workOrder->assigned_member_id) {
            $workOrder->update(['assigned_member_id' => $creatorId]);
            NotificationService::notifyWoAssigned($workOrder, [$creatorId], $currentMember->id);
        }

        NotificationService::notifyWoApproved($workOrder, $currentMember->id);

        $workOrder->load(['asset', 'site', 'team', 'createdBy.user', 'assignedMember.user']);

        return response()->json([
            'success' => true,
            'message' => 'Work order approved.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ]);
    }

    public function reject(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if ($workOrder->status !== 'pending_approval') {
            return response()->json(['success' => false, 'message' => 'This work order is not pending approval.'], 422);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager) {
            return response()->json(['success' => false, 'message' => 'Only managers and admins can reject work orders.'], 403);
        }

        $request->validate(['reason' => 'nullable|string|max:500']);

        $oldStatus = $workOrder->status;

        $workOrder->update(['status' => 'rejected']);

        $workOrder->statusHistory()->create([
            'changed_by_member_id' => $currentMember->id,
            'old_status'           => $oldStatus,
            'new_status'           => 'rejected',
            'note'                 => $request->reason,
            'changed_at'           => now(),
        ]);

        NotificationService::notifyWoRejected($workOrder, $currentMember->id, $request->reason);

        $workOrder->load(['asset', 'site', 'team', 'createdBy.user', 'assignedMember.user']);

        return response()->json([
            'success' => true,
            'message' => 'Work order rejected.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ]);
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

        if (! $this->canModifyWorkOrder($currentMember, $workOrder)) {
            return response()->json(['success' => false, 'message' => 'You can only modify work orders assigned to you.'], 403);
        }

        $assignedMemberId = array_key_exists('assigned_member_id', $validated) ? $validated['assigned_member_id'] : 'NOT_SET';
        unset($validated['assigned_member_id']);

        // Only block if the assignment is actually changing
        if ($assignedMemberId !== 'NOT_SET' && $currentMember) {
            $isChanging = (int) $workOrder->assigned_member_id !== (int) $assignedMemberId;

            if ($isChanging) {
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
        }

        $oldStatus = $workOrder->status;

        if (! empty($validated)) {
            // Auto-set closed_at when completing/cancelling
            if (isset($validated['status']) && in_array($validated['status'], ['completed', 'cancelled'])) {
                $validated['closed_at']            = now();
                $validated['closed_by_member_id']  = $currentMember?->id;
            }

            // Re-derive site_id when asset changes
            if (isset($validated['asset_id'])) {
                $newAsset = \App\Models\Asset::find($validated['asset_id']);
                $validated['site_id'] = $newAsset?->site_id;
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

        if ($assignedMemberId !== 'NOT_SET') {
            $previousId = $workOrder->assigned_member_id;
            $workOrder->update(['assigned_member_id' => $assignedMemberId]);

            if ($assignedMemberId && $assignedMemberId !== $previousId && $currentMember) {
                NotificationService::notifyWoAssigned($workOrder, [$assignedMemberId], $currentMember->id);

                $assignedMember = \App\Models\Member::with('user:id,name')->find($assignedMemberId);
                WorkOrderActivityService::log($workOrder->id, 'assigned', $currentMember->id, [
                    'member_id'   => $assignedMemberId,
                    'member_name' => $assignedMember?->user?->name ?? 'Unknown',
                ]);
            } elseif (! $assignedMemberId && $previousId && $currentMember) {
                WorkOrderActivityService::log($workOrder->id, 'unassigned', $currentMember->id);
            }
        }

        if (isset($validated['status']) && $validated['status'] !== $oldStatus && $currentMember) {
            NotificationService::notifyWoStatusChanged($workOrder, $oldStatus, $validated['status'], $currentMember->id);
        }

        $workOrder->load(['asset', 'site', 'team', 'createdBy.user', 'assignedMember.user']);

        return response()->json([
            'success' => true,
            'message' => 'Work order updated successfully.',
            'data'    => ['work_order' => WorkOrderResource::make($workOrder)->resolve()],
        ]);
    }

    public function destroy(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Work order not found.'], 404);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager) {
            return response()->json(['success' => false, 'message' => 'Only administrators and managers can delete work orders.'], 403);
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

        NotificationService::notifyMentions($workOrder, $request->body, $currentMember->id);

        $comment->load('member.user');

        WorkOrderActivityService::log($workOrder->id, 'comment_added', $currentMember->id, [
            'comment_id' => $comment->id,
            'snippet'    => mb_substr($request->body, 0, 120),
        ]);

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

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! $this->canModifyWorkOrder($currentMember, $workOrder)) {
            return response()->json(['success' => false, 'message' => 'You can only act on work orders assigned to you.'], 403);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager && $comment->member_id !== $currentMember->id) {
            return response()->json(['success' => false, 'message' => 'You can only delete your own comments.'], 403);
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

        if (! $this->canModifyWorkOrder($currentMember, $workOrder)) {
            return response()->json(['success' => false, 'message' => 'You can only add attachments to work orders assigned to you.'], 403);
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

        WorkOrderActivityService::log($workOrder->id, 'attachment_added', $currentMember->id, [
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
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
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! $this->canModifyWorkOrder($currentMember, $workOrder)) {
            return response()->json(['success' => false, 'message' => 'You can only act on work orders assigned to you.'], 403);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager && $attachment->member_id !== $currentMember->id) {
            return response()->json(['success' => false, 'message' => 'You can only delete your own attachments.'], 403);
        }

        Storage::disk('public')->delete($attachment->stored_path);
        $attachment->delete();

        return response()->json(['success' => true, 'message' => 'Attachment deleted.']);
    }

    // ── Activity feed ─────────────────────────────────────────────────────────

    public function activities(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany || (int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $workOrder->load(['createdBy.user', 'statusHistory.changedBy.user']);

        $events = collect();

        // Created event
        $events->push([
            'type'       => 'created',
            'actor'      => $workOrder->createdBy?->user?->name,
            'meta'       => [],
            'created_at' => $workOrder->opened_at?->toISOString() ?? $workOrder->created_at?->toISOString(),
        ]);

        // Status history
        foreach ($workOrder->statusHistory as $h) {
            $events->push([
                'type'       => 'status_change',
                'actor'      => $h->changedBy?->user?->name,
                'meta'       => ['old_status' => $h->old_status, 'new_status' => $h->new_status, 'note' => $h->note],
                'created_at' => $h->changed_at?->toISOString(),
            ]);
        }

        // Other activities
        $activities = \App\Models\WorkOrderActivity::query()
            ->where('work_order_id', $workOrder->id)
            ->with('actor.user:id,name')
            ->orderBy('created_at')
            ->get();

        foreach ($activities as $a) {
            $events->push([
                'type'       => $a->type,
                'actor'      => $a->actor?->user?->name,
                'meta'       => $a->meta ?? [],
                'created_at' => $a->created_at?->toISOString(),
            ]);
        }

        $sorted = $events->sortBy('created_at')->values()->all();

        return response()->json(['success' => true, 'data' => ['activities' => $sorted]]);
    }

    public function archive(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager) {
            return response()->json(['success' => false, 'message' => 'Only admins and managers can archive work orders.'], 403);
        }

        $workOrder->update(['archived_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Work order archived.']);
    }

    public function unarchive(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ((int) $workOrder->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $isAdminOrManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if (! $isAdminOrManager) {
            return response()->json(['success' => false, 'message' => 'Only admins and managers can unarchive work orders.'], 403);
        }

        $workOrder->update(['archived_at' => null]);

        return response()->json(['success' => true, 'message' => 'Work order unarchived.']);
    }

    private function canModifyWorkOrder(mixed $member, WorkOrder $workOrder): bool
    {
        if (! $member) return false;

        $isAdminOrManager = $member->roles()->whereIn('code', ['admin', 'manager'])->exists();
        if ($isAdminOrManager) return true;

        return (int) $workOrder->assigned_member_id === (int) $member->id;
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
