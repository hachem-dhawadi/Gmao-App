<?php

namespace App\Http\Controllers\Api\V1\Pm;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\PmPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PmPlanController extends Controller
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

        $query = PmPlan::query()
            ->with(['assets', 'createdBy.user', 'assignedTo.user', 'triggers'])
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
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $plans = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'PM plans retrieved successfully.',
            'data'    => $this->transformPaginator($plans),
        ]);
    }

    public function show(Request $request, PmPlan $pmPlan): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $pmPlan->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'PM plan not found.'], 404);
        }

        $pmPlan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers', 'pmWorkOrders.workOrder']);

        return response()->json([
            'success' => true,
            'message' => 'PM plan retrieved successfully.',
            'data'    => ['pm_plan' => $this->formatPlan($pmPlan)],
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
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string|max:5000',
            'status'             => 'required|in:active,inactive,draft',
            'priority'           => 'required|in:low,medium,high,critical',
            'estimated_minutes'  => 'nullable|integer|min:1',
            'asset_id'           => 'nullable|integer|exists:assets,id',
            'assigned_member_id' => 'nullable|integer|exists:members,id',
            'trigger'            => 'required|array',
            'trigger.type'       => 'required|in:time_based',
            'trigger.interval_value' => 'required|integer|min:1',
            'trigger.interval_unit'  => 'required|in:days,weeks,months',
            'trigger.next_run_at'    => 'nullable|date',
        ]);

        $code = $this->generateCode($currentCompany->id);

        $plan = DB::transaction(function () use ($validated, $currentCompany, $currentMember, $code) {
            $plan = PmPlan::query()->create([
                'company_id'           => $currentCompany->id,
                'code'                 => $code,
                'name'                 => $validated['name'],
                'description'          => $validated['description'] ?? null,
                'status'               => $validated['status'],
                'priority'             => $validated['priority'],
                'estimated_minutes'    => $validated['estimated_minutes'] ?? null,
                'created_by_member_id' => $currentMember->id,
                'assigned_member_id'   => $validated['assigned_member_id'] ?? null,
            ]);

            if (! empty($validated['asset_id'])) {
                $plan->assets()->sync([$validated['asset_id']]);
            }

            $trigger = $validated['trigger'];
            $plan->triggers()->create([
                'trigger_type'   => $trigger['type'],
                'interval_value' => $trigger['interval_value'],
                'interval_unit'  => $trigger['interval_unit'],
                'next_run_at'    => $trigger['next_run_at'] ?? null,
            ]);

            return $plan;
        });

        $plan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers']);

        return response()->json([
            'success' => true,
            'message' => 'PM plan created successfully.',
            'data'    => ['pm_plan' => $this->formatPlan($plan)],
        ], 201);
    }

    public function update(Request $request, PmPlan $pmPlan): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $pmPlan->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'PM plan not found.'], 404);
        }

        $validated = $request->validate([
            'name'               => 'sometimes|string|max:255',
            'description'        => 'sometimes|nullable|string|max:5000',
            'status'             => 'sometimes|in:active,inactive,draft',
            'priority'           => 'sometimes|in:low,medium,high,critical',
            'estimated_minutes'  => 'sometimes|nullable|integer|min:1',
            'asset_id'           => 'sometimes|nullable|integer|exists:assets,id',
            'assigned_member_id' => 'sometimes|nullable|integer|exists:members,id',
            'trigger'            => 'sometimes|array',
            'trigger.interval_value' => 'required_with:trigger|integer|min:1',
            'trigger.interval_unit'  => 'required_with:trigger|in:days,weeks,months',
            'trigger.next_run_at'    => 'nullable|date',
        ]);

        $assetId = $validated['asset_id'] ?? null;
        $trigger  = $validated['trigger'] ?? null;
        unset($validated['asset_id'], $validated['trigger']);

        $pmPlan->update($validated);

        if (array_key_exists('asset_id', $request->all())) {
            $pmPlan->assets()->sync($assetId ? [$assetId] : []);
        }

        if ($trigger) {
            $pmPlan->triggers()->updateOrCreate(
                ['pm_plan_id' => $pmPlan->id],
                [
                    'interval_value' => $trigger['interval_value'],
                    'interval_unit'  => $trigger['interval_unit'],
                    'next_run_at'    => $trigger['next_run_at'] ?? null,
                ]
            );
        }

        $pmPlan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers']);

        return response()->json([
            'success' => true,
            'message' => 'PM plan updated successfully.',
            'data'    => ['pm_plan' => $this->formatPlan($pmPlan)],
        ]);
    }

    public function destroy(Request $request, PmPlan $pmPlan): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if (! $currentCompany) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $pmPlan->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'PM plan not found.'], 404);
        }

        $pmPlan->delete();

        return response()->json([
            'success' => true,
            'message' => 'PM plan deleted successfully.',
        ]);
    }

    private function generateCode(int $companyId): string
    {
        $count = PmPlan::query()->where('company_id', $companyId)->withTrashed()->count() + 1;

        return 'PM-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    private function formatPlan(PmPlan $plan): array
    {
        $trigger = $plan->triggers->first();

        return [
            'id'                 => $plan->id,
            'code'               => $plan->code,
            'name'               => $plan->name,
            'description'        => $plan->description,
            'status'             => $plan->status,
            'priority'           => $plan->priority,
            'estimated_minutes'  => $plan->estimated_minutes,
            'created_at'         => $plan->created_at?->toISOString(),
            'asset'              => $plan->assets->first() ? [
                'id'   => $plan->assets->first()->id,
                'name' => $plan->assets->first()->name,
                'code' => $plan->assets->first()->code,
            ] : null,
            'assigned_to'        => $plan->assignedTo ? [
                'id'   => $plan->assignedTo->id,
                'name' => $plan->assignedTo->user?->name,
            ] : null,
            'created_by'         => $plan->createdBy ? [
                'id'   => $plan->createdBy->id,
                'name' => $plan->createdBy->user?->name,
            ] : null,
            'trigger'            => $trigger ? [
                'id'             => $trigger->id,
                'type'           => $trigger->trigger_type,
                'interval_value' => $trigger->interval_value,
                'interval_unit'  => $trigger->interval_unit,
                'next_run_at'    => $trigger->next_run_at?->toISOString(),
                'last_run_at'    => $trigger->last_run_at?->toISOString(),
            ] : null,
        ];
    }

    private function transformPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'pm_plans'   => $paginator->getCollection()
                ->map(fn (PmPlan $p): array => $this->formatPlan($p))
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
