<?php

namespace App\Http\Controllers\Api\V1\Pm;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\PmPlan;
use App\Models\PmTask;
use App\Services\NotificationService;
use App\Services\PmWorkOrderService;
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
            ->with(['assets', 'createdBy.user', 'assignedTo.user', 'triggers', 'team'])
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

        $pmPlan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers', 'tasks', 'team', 'pmWorkOrders.workOrder']);

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
            'team_id'            => 'nullable|integer|exists:teams,id',
            'trigger'            => 'required|array',
            'trigger.type'       => 'required|in:time_based',
            'trigger.interval_value' => 'required|integer|min:1',
            'trigger.interval_unit'  => 'required|in:days,weeks,months',
            'trigger.next_run_at'    => 'nullable|date',
            'tasks'              => 'nullable|array',
            'tasks.*.title'      => 'required_with:tasks|string|max:500',
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
                'team_id'              => $validated['team_id'] ?? null,
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

            foreach ($validated['tasks'] ?? [] as $idx => $taskData) {
                PmTask::create([
                    'pm_plan_id'  => $plan->id,
                    'title'       => $taskData['title'],
                    'order_index' => $idx,
                ]);
            }

            return $plan;
        });

        $plan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers', 'tasks', 'team']);

        if (! empty($validated['assigned_member_id'])) {
            NotificationService::notifyPmAssigned($plan, (int) $validated['assigned_member_id'], $currentMember->id);
        }

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
            'team_id'            => 'sometimes|nullable|integer|exists:teams,id',
            'trigger'            => 'sometimes|array',
            'trigger.interval_value' => 'required_with:trigger|integer|min:1',
            'trigger.interval_unit'  => 'required_with:trigger|in:days,weeks,months',
            'trigger.next_run_at'    => 'nullable|date',
            'tasks'              => 'sometimes|nullable|array',
            'tasks.*.id'         => 'nullable|integer|exists:pm_tasks,id',
            'tasks.*.title'      => 'required_with:tasks|string|max:500',
        ]);

        $assetId = $validated['asset_id'] ?? null;
        $trigger  = $validated['trigger'] ?? null;
        $tasks    = array_key_exists('tasks', $validated) ? ($validated['tasks'] ?? []) : false;
        unset($validated['asset_id'], $validated['trigger'], $validated['tasks']);

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

        if ($tasks !== false) {
            $incomingIds = collect($tasks)->pluck('id')->filter()->values()->all();
            $pmPlan->tasks()->whereNotIn('id', $incomingIds)->delete();

            foreach ($tasks as $idx => $taskData) {
                if (! empty($taskData['id'])) {
                    PmTask::where('id', $taskData['id'])->update([
                        'title'       => $taskData['title'],
                        'order_index' => $idx,
                    ]);
                } else {
                    PmTask::create([
                        'pm_plan_id'  => $pmPlan->id,
                        'title'       => $taskData['title'],
                        'order_index' => $idx,
                    ]);
                }
            }
        }

        $pmPlan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers', 'tasks', 'team']);

        $currentMember = $request->attributes->get('currentMember');
        if (array_key_exists('assigned_member_id', $validated) && ! empty($validated['assigned_member_id']) && $currentMember) {
            NotificationService::notifyPmAssigned($pmPlan, (int) $validated['assigned_member_id'], $currentMember->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'PM plan updated successfully.',
            'data'    => ['pm_plan' => $this->formatPlan($pmPlan)],
        ]);
    }

    public function updateTasks(Request $request, PmPlan $pmPlan): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');

        if ((int) $pmPlan->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'PM plan not found.'], 404);
        }

        $validated = $request->validate([
            'tasks'          => ['required', 'array'],
            'tasks.*.id'     => ['nullable', 'integer', 'exists:pm_tasks,id'],
            'tasks.*.title'  => ['required', 'string', 'max:500'],
        ]);

        $incomingIds = collect($validated['tasks'])->pluck('id')->filter()->values()->all();
        $pmPlan->tasks()->whereNotIn('id', $incomingIds)->delete();

        foreach ($validated['tasks'] as $idx => $taskData) {
            if (! empty($taskData['id'])) {
                PmTask::where('id', $taskData['id'])->update([
                    'title'       => $taskData['title'],
                    'order_index' => $idx,
                ]);
            } else {
                PmTask::create([
                    'pm_plan_id'  => $pmPlan->id,
                    'title'       => $taskData['title'],
                    'order_index' => $idx,
                ]);
            }
        }

        $pmPlan->load('tasks');

        return response()->json([
            'success' => true,
            'message' => 'Tasks updated.',
            'data'    => [
                'tasks' => $pmPlan->tasks->map(fn ($t) => [
                    'id'          => $t->id,
                    'title'       => $t->title,
                    'order_index' => $t->order_index,
                ])->values()->all(),
            ],
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

    public function generateWorkOrder(Request $request, PmPlan $pmPlan): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Company context is missing.'], 400);
        }

        if ((int) $pmPlan->company_id !== (int) $currentCompany->id) {
            return response()->json(['success' => false, 'message' => 'PM plan not found.'], 404);
        }

        if ($pmPlan->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'Only active PM plans can generate work orders.'], 422);
        }

        // Block if there is already an open WO from this plan
        $hasOpenWo = $pmPlan->pmWorkOrders()
            ->whereHas('workOrder', fn ($q) => $q->whereNotIn('status', ['completed', 'cancelled']))
            ->exists();

        if ($hasOpenWo) {
            return response()->json([
                'success' => false,
                'message' => 'This plan already has an open work order. Complete or cancel it before generating a new one.',
            ], 422);
        }

        $workOrder = PmWorkOrderService::generate($pmPlan, $currentMember->id);

        $pmPlan->load(['assets', 'createdBy.user', 'assignedTo.user', 'triggers', 'tasks', 'team', 'pmWorkOrders.workOrder']);

        return response()->json([
            'success' => true,
            'message' => 'Work order generated successfully.',
            'data'    => [
                'pm_plan'    => $this->formatPlan($pmPlan),
                'work_order' => ['id' => $workOrder->id, 'code' => $workOrder->code],
            ],
        ], 201);
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
            'tasks'              => $plan->relationLoaded('tasks')
                ? $plan->tasks->map(fn ($t) => [
                    'id'          => $t->id,
                    'title'       => $t->title,
                    'order_index' => $t->order_index,
                ])->values()->all()
                : [],
            'team_id'            => $plan->team_id,
            'team'               => $plan->relationLoaded('team') && $plan->team ? [
                'id'    => $plan->team->id,
                'name'  => $plan->team->name,
                'color' => $plan->team->color,
            ] : null,
            'pm_work_orders'     => $plan->relationLoaded('pmWorkOrders')
                ? $plan->pmWorkOrders->map(fn ($pwo) => [
                    'id'         => $pwo->id,
                    'work_order' => $pwo->workOrder ? [
                        'id'         => $pwo->workOrder->id,
                        'code'       => $pwo->workOrder->code,
                        'title'      => $pwo->workOrder->title,
                        'status'     => $pwo->workOrder->status,
                        'created_at' => $pwo->workOrder->created_at?->toISOString(),
                    ] : null,
                ])->values()->all()
                : [],
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
