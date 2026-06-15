<?php

namespace App\Http\Controllers\Api\V1\MaintenanceRequests;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRequest;
use App\Models\WorkOrder;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MaintenanceRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));
        $status  = $request->query('status');

        $isManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();

        $query = MaintenanceRequest::query()
            ->with(['asset', 'requestedBy.user', 'reviewedBy.user', 'workOrder'])
            ->where('company_id', $currentCompany->id)
            ->orderByDesc('id');

        if (! $isManager) {
            $query->where('requested_by_member_id', $currentMember->id);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->query('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $requests = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance requests retrieved successfully.',
            'data'    => $this->transformPaginator($requests),
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
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'priority'    => 'required|in:low,medium,high,critical',
            'asset_id'    => 'nullable|integer|exists:assets,id',
            'location'    => 'nullable|string|max:255',
        ]);

        $count = MaintenanceRequest::query()
            ->where('company_id', $currentCompany->id)
            ->withTrashed()
            ->count() + 1;

        $req = MaintenanceRequest::create([
            'company_id'              => $currentCompany->id,
            'code'                    => 'REQ-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT),
            'title'                   => $validated['title'],
            'description'             => $validated['description'] ?? null,
            'priority'                => $validated['priority'],
            'asset_id'                => $validated['asset_id'] ?? null,
            'location'                => $validated['location'] ?? null,
            'requested_by_member_id'  => $currentMember->id,
            'status'                  => 'pending',
        ]);

        $req->load(['asset', 'requestedBy.user', 'reviewedBy.user', 'workOrder']);

        NotificationService::notifyNewRequest($req);

        return response()->json([
            'success' => true,
            'message' => 'Request submitted successfully.',
            'data'    => ['request' => $this->format($req)],
        ], 201);
    }

    public function show(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $maintenanceRequest->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }

        $isManager = $currentMember->roles()->whereIn('code', ['admin', 'manager'])->exists();

        if (! $isManager && (int) $maintenanceRequest->requested_by_member_id !== (int) $currentMember->id) {
            return response()->json(['success' => false, 'message' => 'Not authorized.'], 403);
        }

        $maintenanceRequest->load(['asset', 'requestedBy.user', 'reviewedBy.user', 'workOrder']);

        return response()->json([
            'success' => true,
            'message' => 'Request retrieved successfully.',
            'data'    => ['request' => $this->format($maintenanceRequest)],
        ]);
    }

    public function convert(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $maintenanceRequest->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }

        if ($maintenanceRequest->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Only pending requests can be converted.'], 422);
        }

        $validated = $request->validate([
            'title'              => 'nullable|string|max:255',
            'priority'           => 'nullable|in:low,medium,high,critical',
            'assigned_member_id' => 'nullable|integer|exists:members,id',
        ]);

        $workOrder = DB::transaction(function () use ($maintenanceRequest, $currentCompany, $currentMember, $validated) {
            $count = WorkOrder::query()
                ->where('company_id', $currentCompany->id)
                ->withTrashed()
                ->count() + 1;

            $workOrder = WorkOrder::create([
                'company_id'           => $currentCompany->id,
                'code'                 => 'WO-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT),
                'title'                => $validated['title'] ?? $maintenanceRequest->title,
                'description'          => $maintenanceRequest->description,
                'priority'             => $validated['priority'] ?? $maintenanceRequest->priority,
                'asset_id'             => $maintenanceRequest->asset_id,
                'status'               => 'open',
                'created_by_member_id' => $currentMember->id,
                'assigned_member_id'   => $validated['assigned_member_id'] ?? null,
                'opened_at'            => Carbon::now(),
            ]);

            $maintenanceRequest->update([
                'status'                  => 'converted',
                'work_order_id'           => $workOrder->id,
                'reviewed_by_member_id'   => $currentMember->id,
            ]);

            return $workOrder;
        });

        $maintenanceRequest->load(['asset', 'requestedBy.user', 'reviewedBy.user', 'workOrder']);

        NotificationService::notifyRequestReviewed($maintenanceRequest, 'converted', $workOrder->code);

        return response()->json([
            'success' => true,
            'message' => 'Request converted to work order successfully.',
            'data'    => [
                'request'    => $this->format($maintenanceRequest),
                'work_order' => ['id' => $workOrder->id, 'code' => $workOrder->code],
            ],
        ]);
    }

    public function reject(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $maintenanceRequest->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }

        if ($maintenanceRequest->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Only pending requests can be rejected.'], 422);
        }

        $validated = $request->validate([
            'review_note' => 'nullable|string|max:1000',
        ]);

        $maintenanceRequest->update([
            'status'                => 'rejected',
            'review_note'           => $validated['review_note'] ?? null,
            'reviewed_by_member_id' => $currentMember->id,
        ]);

        $maintenanceRequest->load(['asset', 'requestedBy.user', 'reviewedBy.user', 'workOrder']);

        NotificationService::notifyRequestReviewed($maintenanceRequest, 'rejected');

        return response()->json([
            'success' => true,
            'message' => 'Request rejected.',
            'data'    => ['request' => $this->format($maintenanceRequest)],
        ]);
    }

    public function destroy(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $maintenanceRequest->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'Request not found.'], 404);
        }

        $maintenanceRequest->delete();

        return response()->json(['success' => true, 'message' => 'Request deleted.']);
    }

    private function format(MaintenanceRequest $req): array
    {
        return [
            'id'           => $req->id,
            'code'         => $req->code,
            'title'        => $req->title,
            'description'  => $req->description,
            'priority'     => $req->priority,
            'status'       => $req->status,
            'location'     => $req->location,
            'review_note'  => $req->review_note,
            'created_at'   => $req->created_at?->toISOString(),
            'updated_at'   => $req->updated_at?->toISOString(),
            'asset'        => $req->asset ? [
                'id'   => $req->asset->id,
                'code' => $req->asset->code,
                'name' => $req->asset->name,
            ] : null,
            'requested_by' => $req->requestedBy ? [
                'id'   => $req->requestedBy->id,
                'name' => $req->requestedBy->user?->name,
            ] : null,
            'reviewed_by'  => $req->reviewedBy ? [
                'id'   => $req->reviewedBy->id,
                'name' => $req->reviewedBy->user?->name,
            ] : null,
            'work_order'   => $req->workOrder ? [
                'id'   => $req->workOrder->id,
                'code' => $req->workOrder->code,
            ] : null,
        ];
    }

    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'requests'   => $paginator->getCollection()
                ->map(fn (MaintenanceRequest $r): array => $this->format($r))
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
