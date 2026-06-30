<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\MaintenanceRequest;
use App\Models\Member;
use App\Models\PmPlan;
use App\Models\PmTask;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiController extends Controller
{
    private const MODEL   = 'llama-3.3-70b-versatile';
    private const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    private function headers(): array
    {
        return ['Authorization' => 'Bearer ' . config('services.groq.api_key')];
    }

    private function systemPrompt(): string
    {
        return 'You are an expert CMMS (Computerized Maintenance Management System) AI assistant embedded in a maintenance management platform. '
            . 'You help with ALL topics related to the maintenance world, including: '
            . '- CMMS app usage (how to create work orders, manage assets, set up PM plans, assign technicians, etc.) '
            . '- Machine troubleshooting and repair guidance (what to check, common failure causes, diagnostic steps) '
            . '- Maintenance best practices (lubrication schedules, inspection checklists, safety procedures) '
            . '- Technical knowledge about industrial equipment (pumps, motors, compressors, boilers, conveyors, HVAC, etc.) '
            . '- Querying live data from the CMMS database (work orders, assets, technicians, anomalies, PM plans) '
            . 'If a technician says "help me fix the machine", give practical diagnostic steps and what to check. '
            . 'Only decline requests that are completely unrelated to maintenance, equipment, or the CMMS app (e.g. cooking, sports, general news). '
            . 'IMPORTANT: Only call a tool when the user explicitly requests that data. For general questions, explanations, or advice — answer with text only, do NOT call any tool. '
            . 'Be concise, practical, and professional. Use markdown formatting when appropriate. '
            . 'Today is ' . now()->format('Y-m-d') . '.';
    }

    private function getCurrentMember(Request $request, $company): ?Member
    {
        if (! $company || ! $request->user()) return null;

        return Member::where('company_id', $company->id)
            ->where('user_id', $request->user()->id)
            ->with('roles:id,code')
            ->first();
    }

    private function isTechnician(?Member $member): bool
    {
        if (! $member) return false;
        $codes = $member->roles->pluck('code')->toArray();
        return in_array('technician', $codes)
            && ! array_intersect($codes, ['admin', 'manager', 'owner', 'supervisor']);
    }

    private function buildTools(bool $technicianMode = false): array
    {
        $woDescription = $technicianMode
            ? 'Retrieve YOUR assigned work orders. Only shows work orders assigned to you.'
            : 'Retrieve work orders from the CMMS. Use for any question about work orders, jobs, tasks, tickets, interventions, repairs.';

        $tools = [
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'get_work_orders',
                    'description' => $woDescription,
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'status'   => ['type' => 'string', 'enum' => ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']],
                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high', 'critical']],
                            'limit'    => ['type' => 'integer', 'description' => 'Max results, default 10'],
                        ],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'get_assets',
                    'description' => 'Retrieve assets/equipment from the CMMS. Use for questions about machines, devices, or physical equipment.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'search' => ['type' => 'string', 'description' => 'Search by asset name or code'],
                            'limit'  => ['type' => 'integer'],
                        ],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'get_technicians',
                    'description' => 'Get all technicians with their open work order count and availability. Use for workload or availability questions.',
                    'parameters'  => ['type' => 'object', 'properties' => (object)[]],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'get_members',
                    'description' => 'Get the list of members/users/employees. Only call this when the user EXPLICITLY asks to list, show, or find users/members/employees. Do NOT call this for general questions about the company.',
                    'parameters'  => ['type' => 'object', 'properties' => (object)[]],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'get_pm_plans',
                    'description' => 'Get preventive maintenance plans.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'limit' => ['type' => 'integer'],
                        ],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'analyze_asset_health',
                    'description' => 'Analyze asset health and risk based on maintenance history. Use for predictive maintenance, health checks, or risk analysis.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'asset_id' => ['type' => 'integer', 'description' => 'Specific asset ID (optional, omit for all)'],
                        ],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'detect_anomalies',
                    'description' => 'Detect anomalies: overdue work orders, repeated asset failures, overloaded technicians. Use when asked about problems, alerts, or issues.',
                    'parameters'  => ['type' => 'object', 'properties' => (object)[]],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'suggest_pm_plans',
                    'description' => 'Generate preventive maintenance plan suggestions for all company assets based on health analysis and technician availability. Use when the user asks to create, generate, or suggest PM plans.',
                    'parameters'  => ['type' => 'object', 'properties' => (object)[]],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'suggest_work_order',
                    'description' => 'Prepare a work order for creation. Use when the user asks to create, open, or submit a work order. Extracts details from the user\'s message and resolves the asset.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'title'             => ['type' => 'string', 'description' => 'Short work order title'],
                            'description'       => ['type' => 'string', 'description' => 'Detailed description of the work'],
                            'priority'          => ['type' => 'string', 'enum' => ['low', 'medium', 'high', 'critical']],
                            'due_at'            => ['type' => 'string', 'description' => 'Due date in YYYY-MM-DD format, null if not mentioned'],
                            'estimated_minutes' => ['type' => 'integer', 'description' => 'Estimated duration in minutes'],
                            'asset_name'        => ['type' => 'string', 'description' => 'Asset name or partial name mentioned by the user'],
                        ],
                        'required' => ['title', 'priority'],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'suggest_maintenance_request',
                    'description' => 'Prepare a maintenance request for submission. Use when the user wants to report a problem, issue, or breakdown — e.g. "report a problem with the pump", "machine is making noise", "submit a maintenance request". Extracts details and resolves the asset.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'title'       => ['type' => 'string', 'description' => 'Short request title describing the problem'],
                            'description' => ['type' => 'string', 'description' => 'Detailed description of the problem, symptoms, and when it started'],
                            'priority'    => ['type' => 'string', 'enum' => ['low', 'medium', 'high', 'critical']],
                            'asset_name'  => ['type' => 'string', 'description' => 'Asset or machine name mentioned by the user'],
                            'location'    => ['type' => 'string', 'description' => 'Physical location if no specific asset (e.g. Building B, Floor 2)'],
                        ],
                        'required' => ['title', 'priority'],
                    ],
                ],
            ],
        ];

        // Technicians only see their own data — strip manager-only tools
        if ($technicianMode) {
            $managerOnly = ['get_members', 'get_technicians', 'detect_anomalies'];
            $tools = array_values(array_filter(
                $tools,
                fn ($t) => ! in_array($t['function']['name'], $managerOnly)
            ));
        }

        return $tools;
    }

    // ── Public endpoints ───────────────────────────────────────────────────────

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'prompt'       => 'required|string|max:4000',
            'page_context' => 'nullable|string|max:200',
        ]);

        if (empty(config('services.groq.api_key'))) {
            return $this->textResponse('AI service not configured. Please add GROQ_API_KEY to your .env file.');
        }

        $prompt         = $request->input('prompt');
        $pageContext    = $request->input('page_context');
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $this->getCurrentMember($request, $currentCompany);
        $technicianMode = $this->isTechnician($currentMember);

        $systemContent = $this->systemPrompt();
        if ($pageContext) {
            $systemContent .= "\n\nThe user is currently on the **{$pageContext}** page of the CMMS app. "
                . 'Tailor your response to be especially helpful for what they are doing on this page.';
        }

        $messages = [
            ['role' => 'system', 'content' => $systemContent],
            ['role' => 'user', 'content' => $prompt],
        ];

        $payload = [
            'model'      => self::MODEL,
            'messages'   => $messages,
            'max_tokens' => 2048,
        ];

        if ($currentCompany) {
            $payload['tools']       = $this->buildTools($technicianMode);
            $payload['tool_choice'] = 'auto';
        }

        try {
            $response = Http::withoutVerifying()
                ->withHeaders($this->headers())
                ->timeout(30)
                ->post(self::API_URL, $payload);
        } catch (\Exception $e) {
            Log::error('Groq connection error: ' . $e->getMessage());
            return $this->textResponse('Could not connect to AI service. Please try again.');
        }

        if ($response->failed()) {
            Log::error('Groq chat failed', ['status' => $response->status(), 'body' => $response->body()]);
            return $this->textResponse('AI service error. Please try again.');
        }

        $choice  = $response->json('choices.0');
        $message = $choice['message'];
        $action  = null;

        if (($choice['finish_reason'] ?? '') === 'tool_calls' && ! empty($message['tool_calls'])) {
            $toolCall = $message['tool_calls'][0];
            $toolName = $toolCall['function']['name'];
            $toolArgs = json_decode($toolCall['function']['arguments'], true) ?? [];

            $result = $this->executeTool($toolName, $toolArgs, $currentCompany, $technicianMode ? $currentMember : null);

            $action = ['type' => $toolName, 'data' => $result];

            // Second call — send tool result back to get the final natural-language response
            $messages[] = $message;
            $messages[] = [
                'role'         => 'tool',
                'tool_call_id' => $toolCall['id'],
                'content'      => json_encode($result),
            ];

            try {
                $response2 = Http::withoutVerifying()
                    ->withHeaders($this->headers())
                    ->timeout(30)
                    ->post(self::API_URL, [
                        'model'      => self::MODEL,
                        'messages'   => $messages,
                        'max_tokens' => 2048,
                    ]);

                $finalText = $response2->json('choices.0.message.content') ?? 'Here is the data you requested.';
            } catch (\Exception $e) {
                $finalText = 'Here is the data you requested.';
            }
        } else {
            $finalText = $message['content'] ?? '';
        }

        return response()->json([
            'id'      => Str::uuid(),
            'choices' => [['finish_reason' => 'stop', 'index' => 0, 'logprobs' => null,
                'message' => ['content' => $finalText, 'role' => 'assistant']]],
            'created' => now()->unix(),
            'model'   => self::MODEL,
            'action'  => $action,
        ]);
    }

    public function history(): JsonResponse
    {
        return response()->json([]);
    }

    public function suggestTechnician(Request $request): JsonResponse
    {
        $request->validate([
            'due_at'            => 'nullable|date',
            'estimated_minutes' => 'nullable|integer|min:0',
            'priority'          => 'nullable|string',
            'description'       => 'nullable|string|max:1000',
            'asset_id'          => 'nullable|integer',
        ]);

        $currentCompany = $request->attributes->get('currentCompany');
        if (! $currentCompany) {
            return response()->json(['error' => 'Company context is missing.'], 400);
        }

        if (empty(config('services.groq.api_key'))) {
            return response()->json(['error' => 'AI service not configured.'], 503);
        }

        $requestedDueAt    = $request->input('due_at') ? Carbon::parse($request->input('due_at')) : null;
        $requestedEstimate = (int) ($request->input('estimated_minutes', 60));
        $priority          = $request->input('priority', 'medium');
        $description       = $request->input('description', '');

        $technicians = Member::query()
            ->with(['user', 'roles'])
            ->where('company_id', $currentCompany->id)
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->get();

        if ($technicians->isEmpty()) {
            return response()->json(['error' => 'No technicians found in this company.'], 422);
        }

        $techIds = $technicians->pluck('id');
        $openWos = WorkOrder::query()
            ->whereIn('assigned_member_id', $techIds)
            ->where('company_id', $currentCompany->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('due_at')
            ->get(['assigned_member_id', 'due_at', 'estimated_minutes']);

        $woByTech  = $openWos->groupBy('assigned_member_id');
        $lines     = [];
        $memberMap = [];

        foreach ($technicians as $tech) {
            $name                 = $tech->user?->name ?? $tech->employee_code ?? "Technician #{$tech->id}";
            $memberMap[$tech->id] = ['id' => $tech->id, 'name' => $name];
            $techWos              = $woByTech->get($tech->id, collect());
            $woCount              = $techWos->count();

            $conflicts = [];
            if ($requestedDueAt) {
                foreach ($techWos as $wo) {
                    $woDue   = Carbon::parse($wo->due_at);
                    $diffMin = abs($requestedDueAt->diffInMinutes($woDue));
                    $window  = ($requestedEstimate / 2) + ((int) ($wo->estimated_minutes ?? 60) / 2) + 120;
                    if ($diffMin < $window) {
                        $conflicts[] = "WO due {$woDue->format('Y-m-d H:i')} (est. " . ($wo->estimated_minutes ?? '?') . ' min)';
                    }
                }
            }

            $status  = empty($conflicts) ? 'AVAILABLE' : 'CONFLICT: ' . implode('; ', $conflicts);
            $lines[] = "- {$name} (ID: {$tech->id}): {$woCount} open WO(s). {$status}";
        }

        $dueAtStr = $requestedDueAt ? $requestedDueAt->format('Y-m-d H:i') : 'not specified';
        $prompt   = "You are a CMMS dispatcher. Pick the best technician for this work order.\n"
            . "WO: priority={$priority}, due={$dueAtStr}, duration={$requestedEstimate}min, description=\"{$description}\"\n"
            . "Technicians:\n" . implode("\n", $lines) . "\n"
            . 'Rules: prefer AVAILABLE, then fewest WOs. If all busy pick least conflicted. '
            . 'Respond with JSON only: {"member_id": <number>, "name": "<string>", "reason": "<one sentence>"}';

        try {
            $response = Http::withoutVerifying()
                ->withHeaders($this->headers())
                ->timeout(30)
                ->post(self::API_URL, [
                    'model'           => self::MODEL,
                    'messages'        => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens'      => 256,
                    'response_format' => ['type' => 'json_object'],
                ]);
        } catch (\Exception $e) {
            Log::error('Groq suggest-technician error: ' . $e->getMessage());
            return response()->json(['error' => 'Could not connect to AI service.'], 502);
        }

        if ($response->failed()) {
            Log::error('Groq suggest-technician failed', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['error' => 'AI service error.', 'details' => $response->json('error.message')], 502);
        }

        $text       = $response->json('choices.0.message.content') ?? '{}';
        $suggestion = json_decode($text, true);

        if (! $suggestion || ! isset($suggestion['member_id'])) {
            return response()->json(['error' => 'AI could not produce a recommendation.', 'raw' => $text], 502);
        }

        $memberId = (int) $suggestion['member_id'];
        if (! isset($memberMap[$memberId])) {
            return response()->json(['error' => 'AI returned an invalid member_id.'], 502);
        }

        return response()->json([
            'member_id' => $memberId,
            'name'      => $memberMap[$memberId]['name'],
            'reason'    => $suggestion['reason'] ?? 'Best available technician.',
        ]);
    }

    // ── Work Order Suggestion + Direct Create ─────────────────────────────────

    private function toolSuggestWorkOrder(array $args, int $companyId): array
    {
        $assetId   = null;
        $assetName = null;
        $assetCode = null;

        if (! empty($args['asset_name'])) {
            $search = $args['asset_name'];
            $asset  = Asset::where('company_id', $companyId)
                ->whereNull('archived_at')
                ->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%"))
                ->first(['id', 'name', 'code']);

            if ($asset) {
                $assetId   = $asset->id;
                $assetName = $asset->name;
                $assetCode = $asset->code;
            }
        }

        return [
            'title'             => $args['title']             ?? '',
            'description'       => $args['description']       ?? '',
            'priority'          => $args['priority']          ?? 'medium',
            'due_at'            => $args['due_at']            ?? null,
            'estimated_minutes' => $args['estimated_minutes'] ?? null,
            'asset_id'          => $assetId,
            'asset_name'        => $assetName,
            'asset_code'        => $assetCode,
        ];
    }

    // ── Maintenance Request Suggestion + Direct Create ────────────────────────

    private function toolSuggestMaintenanceRequest(array $args, int $companyId): array
    {
        $assetId   = null;
        $assetName = null;
        $assetCode = null;

        if (! empty($args['asset_name'])) {
            $search = $args['asset_name'];
            $asset  = Asset::where('company_id', $companyId)
                ->whereNull('archived_at')
                ->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%"))
                ->first(['id', 'name', 'code']);

            if ($asset) {
                $assetId   = $asset->id;
                $assetName = $asset->name;
                $assetCode = $asset->code;
            }
        }

        return [
            'title'       => $args['title']       ?? '',
            'description' => $args['description']  ?? '',
            'priority'    => $args['priority']     ?? 'medium',
            'location'    => $args['location']     ?? null,
            'asset_id'    => $assetId,
            'asset_name'  => $assetName,
            'asset_code'  => $assetCode,
        ];
    }

    public function createMaintenanceRequestFromAi(Request $request): JsonResponse
    {
        $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'priority'    => 'required|in:low,medium,high,critical',
            'asset_id'    => 'nullable|integer',
            'location'    => 'nullable|string|max:255',
        ]);

        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['error' => 'Company context missing.'], 400);
        }

        $assetId = $request->input('asset_id');

        if ($assetId) {
            $assetExists = Asset::where('id', $assetId)
                ->where('company_id', $currentCompany->id)
                ->exists();
            if (! $assetExists) $assetId = null;
        }

        $asset = $assetId ? Asset::find($assetId) : null;

        $count = MaintenanceRequest::where('company_id', $currentCompany->id)->withTrashed()->count() + 1;
        $code  = 'REQ-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);

        $req = MaintenanceRequest::create([
            'company_id'              => $currentCompany->id,
            'code'                    => $code,
            'title'                   => $request->input('title'),
            'description'             => $request->input('description'),
            'priority'                => $request->input('priority'),
            'status'                  => 'pending',
            'asset_id'                => $assetId,
            'location'                => $assetId ? null : $request->input('location'),
            'requested_by_member_id'  => $currentMember->id,
        ]);

        return response()->json([
            'id'         => $req->id,
            'code'       => $req->code,
            'title'      => $req->title,
            'priority'   => $req->priority,
            'asset_name' => $asset?->name,
            'location'   => $req->location,
        ], 201);
    }

    public function createWorkOrderFromAi(Request $request): JsonResponse
    {
        $request->validate([
            'title'             => 'required|string|max:255',
            'description'       => 'nullable|string|max:5000',
            'priority'          => 'required|in:low,medium,high,critical',
            'due_at'            => 'nullable|date',
            'estimated_minutes' => 'nullable|integer|min:1',
            'asset_id'          => 'nullable|integer',
        ]);

        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['error' => 'Company context missing.'], 400);
        }

        $assetId = $request->input('asset_id');

        if ($assetId) {
            $assetExists = Asset::where('id', $assetId)
                ->where('company_id', $currentCompany->id)
                ->exists();
            if (! $assetExists) $assetId = null;
        }

        $asset = $assetId ? Asset::find($assetId) : null;

        $count = WorkOrder::where('company_id', $currentCompany->id)->withTrashed()->count() + 1;
        $code  = 'WO-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);

        $wo = WorkOrder::create([
            'company_id'           => $currentCompany->id,
            'code'                 => $code,
            'title'                => $request->input('title'),
            'description'          => $request->input('description'),
            'priority'             => $request->input('priority'),
            'status'               => 'open',
            'due_at'               => $request->input('due_at'),
            'estimated_minutes'    => $request->input('estimated_minutes'),
            'asset_id'             => $assetId,
            'site_id'              => $asset?->site_id,
            'created_by_member_id' => $currentMember->id,
            'opened_at'            => now(),
        ]);

        return response()->json([
            'id'         => $wo->id,
            'code'       => $wo->code,
            'title'      => $wo->title,
            'priority'   => $wo->priority,
            'asset_name' => $asset?->name,
        ], 201);
    }

    // ── Work Order Form Filler ────────────────────────────────────────────────

    public function fillWorkOrder(Request $request): JsonResponse
    {
        $request->validate(['prompt' => 'required|string|max:2000']);

        if (empty(config('services.groq.api_key'))) {
            return response()->json(['error' => 'AI service not configured.'], 503);
        }

        $today = now()->format('Y-m-d');
        $dayOfWeek = now()->format('l');

        $systemPrompt = "You are a CMMS work order assistant. Extract structured work order details from the user's description. "
            . "Today is {$today} ({$dayOfWeek}). "
            . "Return ONLY a JSON object with these exact fields:\n"
            . "- title: string (short professional title, max 80 chars, no filler words)\n"
            . "- description: string (professional 1-3 sentence description with what needs to be done and why)\n"
            . "- priority: exactly one of 'low'|'medium'|'high'|'critical'\n"
            . "- due_at: string|null (YYYY-MM-DD format only. Convert relative dates: 'tomorrow', 'friday', 'next week', etc. to real dates based on today. Return null if not mentioned)\n"
            . "- estimated_minutes: integer|null (convert '2 hours'→120, '30 min'→30, '1.5h'→90. Return null if not mentioned)\n"
            . "Priority rules: 'urgent'/'emergency'/'critical'/'immediately'→critical, 'important'/'asap'/'soon'→high, 'when possible'/'low priority'→low, anything else→medium";

        try {
            $response = Http::withoutVerifying()
                ->withHeaders($this->headers())
                ->timeout(30)
                ->post(self::API_URL, [
                    'model'           => self::MODEL,
                    'messages'        => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user',   'content' => $request->input('prompt')],
                    ],
                    'max_tokens'      => 512,
                    'response_format' => ['type' => 'json_object'],
                ]);
        } catch (\Exception $e) {
            Log::error('Groq fill-work-order error: ' . $e->getMessage());
            return response()->json(['error' => 'Could not connect to AI service.'], 502);
        }

        if ($response->failed()) {
            Log::error('Groq fill-work-order failed', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['error' => 'AI service error.'], 502);
        }

        $data = json_decode($response->json('choices.0.message.content') ?? '{}', true);

        if (empty($data['title'])) {
            return response()->json(['error' => 'AI could not parse the work order.'], 502);
        }

        $validPriorities = ['low', 'medium', 'high', 'critical'];

        return response()->json([
            'title'             => (string) ($data['title'] ?? ''),
            'description'       => (string) ($data['description'] ?? ''),
            'priority'          => in_array($data['priority'] ?? '', $validPriorities) ? $data['priority'] : 'medium',
            'due_at'            => ! empty($data['due_at']) ? $data['due_at'] : null,
            'estimated_minutes' => isset($data['estimated_minutes']) && is_numeric($data['estimated_minutes'])
                ? (int) $data['estimated_minutes']
                : null,
        ]);
    }

    // ── PM Checklist Generator ─────────────────────────────────────────────────

    public function generatePmChecklist(Request $request): JsonResponse
    {
        $request->validate(['asset_id' => 'required|integer']);

        if (empty(config('services.groq.api_key'))) {
            return response()->json(['error' => 'AI service not configured.'], 503);
        }

        $currentCompany = $request->attributes->get('currentCompany');
        if (! $currentCompany) {
            return response()->json(['error' => 'Company context missing.'], 400);
        }

        $asset = Asset::where('company_id', $currentCompany->id)
            ->with('assetType:id,name')
            ->find($request->input('asset_id'));

        if (! $asset) {
            return response()->json(['error' => 'Asset not found.'], 404);
        }

        $assetInfo = $asset->name;
        if ($asset->assetType) {
            $assetInfo .= " (type: {$asset->assetType->name})";
        }

        $prompt = "You are a certified CMMS maintenance engineer. "
            . "Generate a professional preventive maintenance checklist for this equipment: {$assetInfo}.\n"
            . "Requirements:\n"
            . "- 8 to 12 tasks\n"
            . "- Each task must be specific, actionable, and measurable\n"
            . "- Cover: visual inspection, lubrication, calibration, cleaning, safety checks, wear parts\n"
            . "- Use professional maintenance language\n"
            . "Return ONLY a JSON object: {\"tasks\": [\"task 1\", \"task 2\", ...]}";

        try {
            $response = Http::withoutVerifying()
                ->withHeaders($this->headers())
                ->timeout(30)
                ->post(self::API_URL, [
                    'model'           => self::MODEL,
                    'messages'        => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens'      => 1024,
                    'response_format' => ['type' => 'json_object'],
                ]);
        } catch (\Exception $e) {
            Log::error('Groq generate-checklist error: ' . $e->getMessage());
            return response()->json(['error' => 'Could not connect to AI service.'], 502);
        }

        if ($response->failed()) {
            Log::error('Groq generate-checklist failed', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['error' => 'AI service error.'], 502);
        }

        $text  = $response->json('choices.0.message.content') ?? '{}';
        $data  = json_decode($text, true);
        $tasks = $data['tasks'] ?? [];

        if (empty($tasks) || ! is_array($tasks)) {
            return response()->json(['error' => 'AI could not generate checklist.'], 502);
        }

        return response()->json([
            'tasks' => array_map(fn ($t) => ['title' => (string) $t], array_values($tasks)),
        ]);
    }

    // ── Tool execution ─────────────────────────────────────────────────────────

    private function executeTool(string $name, array $args, $company, ?Member $scopeMember = null): array
    {
        $companyId = $company?->id;
        if (! $companyId) return [];

        return match ($name) {
            'get_work_orders'      => $this->toolGetWorkOrders($args, $companyId, $scopeMember?->id),
            'get_assets'           => $this->toolGetAssets($args, $companyId),
            'get_technicians'      => $this->toolGetTechnicians($companyId),
            'get_members'          => $this->toolGetMembers($companyId),
            'get_pm_plans'         => $this->toolGetPmPlans($args, $companyId, $scopeMember?->id),
            'analyze_asset_health' => $this->toolAnalyzeAssetHealth($args, $companyId),
            'detect_anomalies'     => $this->toolDetectAnomalies($companyId),
            'suggest_pm_plans'            => $this->toolSuggestPmPlans($companyId),
            'suggest_work_order'          => $this->toolSuggestWorkOrder($args, $companyId),
            'suggest_maintenance_request' => $this->toolSuggestMaintenanceRequest($args, $companyId),
            default                       => [],
        };
    }

    private function textResponse(string $message): JsonResponse
    {
        return response()->json([
            'id'      => Str::uuid(),
            'choices' => [['finish_reason' => 'stop', 'index' => 0, 'logprobs' => null,
                'message' => ['content' => $message, 'role' => 'assistant']]],
            'created' => now()->unix(),
            'model'   => self::MODEL,
            'action'  => null,
        ]);
    }

    // ── DB tools ───────────────────────────────────────────────────────────────

    private function toolGetWorkOrders(array $args, int $companyId, ?int $scopeMemberId = null): array
    {
        $query = WorkOrder::query()
            ->with(['asset:id,name', 'assignedMember.user:id,name'])
            ->where('company_id', $companyId)
            ->whereNull('archived_at')
            ->orderByDesc('id');

        if ($scopeMemberId)             $query->where('assigned_member_id', $scopeMemberId);
        if (! empty($args['status']))   $query->where('status', $args['status']);
        if (! empty($args['priority'])) $query->where('priority', $args['priority']);

        return $query->limit(min((int) ($args['limit'] ?? 10), 20))->get()->map(fn ($wo) => [
            'id'          => $wo->id,
            'title'       => $wo->title,
            'status'      => $wo->status,
            'priority'    => $wo->priority,
            'due_at'      => $wo->due_at?->format('Y-m-d'),
            'asset'       => $wo->asset?->name,
            'assigned_to' => $wo->assignedMember?->user?->name,
        ])->values()->toArray();
    }

    private function toolGetAssets(array $args, int $companyId): array
    {
        $query = Asset::query()
            ->with(['site:id,name', 'assetType:id,name'])
            ->where('company_id', $companyId)
            ->whereNull('archived_at');

        if (! empty($args['search'])) {
            $s = $args['search'];
            $query->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%"));
        }

        $assets       = $query->limit(min((int) ($args['limit'] ?? 10), 20))->get();
        $openWoCounts = WorkOrder::whereIn('asset_id', $assets->pluck('id'))
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->groupBy('asset_id')
            ->selectRaw('asset_id, count(*) as count')
            ->pluck('count', 'asset_id');

        return $assets->map(fn ($a) => [
            'id'            => $a->id,
            'name'          => $a->name,
            'code'          => $a->code,
            'site'          => $a->site?->name,
            'type'          => $a->assetType?->name,
            'open_wo_count' => (int) ($openWoCounts[$a->id] ?? 0),
        ])->values()->toArray();
    }

    private function toolGetMembers(int $companyId): array
    {
        return Member::query()
            ->with(['user:id,name,email', 'roles:id,code', 'sites:id,name'])
            ->where('company_id', $companyId)
            ->get()
            ->map(fn ($m) => [
                'id'    => $m->id,
                'name'  => $m->user?->name ?? $m->employee_code,
                'email' => $m->user?->email,
                'roles' => $m->roles->pluck('code')->join(', '),
                'sites' => $m->sites->pluck('name')->join(', '),
            ])
            ->values()
            ->toArray();
    }

    private function toolGetTechnicians(int $companyId): array
    {
        $technicians = Member::query()
            ->with(['user:id,name', 'sites:id,name'])
            ->where('company_id', $companyId)
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->get();

        $woCounts = WorkOrder::whereIn('assigned_member_id', $technicians->pluck('id'))
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->groupBy('assigned_member_id')
            ->selectRaw('assigned_member_id, count(*) as count')
            ->pluck('count', 'assigned_member_id');

        return $technicians->map(fn ($t) => [
            'id'            => $t->id,
            'name'          => $t->user?->name ?? $t->employee_code,
            'sites'         => $t->sites->pluck('name')->join(', '),
            'open_wo_count' => (int) ($woCounts[$t->id] ?? 0),
        ])->values()->toArray();
    }

    private function toolGetPmPlans(array $args, int $companyId, ?int $scopeMemberId = null): array
    {
        $query = PmPlan::query()
            ->with(['assets:id,name', 'triggers', 'assignedTo.user:id,name'])
            ->where('company_id', $companyId)
            ->whereNull('archived_at');

        if ($scopeMemberId) $query->where('assigned_to_member_id', $scopeMemberId);

        return $query
            ->limit(min((int) ($args['limit'] ?? 10), 20))
            ->get()
            ->map(fn ($p) => [
                'id'          => $p->id,
                'name'        => $p->name,
                'code'        => $p->code,
                'status'      => $p->status,
                'assets'      => $p->assets->pluck('name')->join(', '),
                'assigned_to' => $p->assignedTo?->user?->name,
                'trigger'     => $p->triggers->first()
                    ? $p->triggers->first()->interval_value . ' ' . $p->triggers->first()->interval_unit
                    : null,
                'next_run_at' => $p->triggers->first()?->next_run_at?->format('Y-m-d'),
            ])
            ->values()
            ->toArray();
    }

    private function toolSuggestPmPlans(int $companyId): array
    {
        // 1. Assets with health data (last 90 days)
        $assets = Asset::where('company_id', $companyId)
            ->whereNull('archived_at')
            ->with('assetType:id,name')
            ->get();

        if ($assets->isEmpty()) return ['plans' => [], 'error' => 'No assets found.'];

        $woStats = WorkOrder::where('company_id', $companyId)
            ->where('created_at', '>=', now()->subDays(90))
            ->get(['asset_id', 'status', 'priority', 'due_at']);

        $statsByAsset = $woStats->groupBy('asset_id')->map(fn ($wos) => [
            'total'    => $wos->count(),
            'open'     => $wos->whereIn('status', ['open', 'in_progress', 'on_hold'])->count(),
            'critical' => $wos->where('priority', 'critical')->count(),
            'overdue'  => $wos->filter(fn ($w) => $w->due_at && $w->due_at < now() && ! in_array($w->status, ['completed', 'cancelled']))->count(),
        ]);

        // 2. Technicians with availability
        $technicians = Member::where('company_id', $companyId)
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->with('user:id,name')
            ->get();

        $techWoCounts = WorkOrder::whereIn('assigned_member_id', $technicians->pluck('id'))
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->groupBy('assigned_member_id')
            ->selectRaw('assigned_member_id, count(*) as count')
            ->pluck('count', 'assigned_member_id');

        $techLines = $technicians->map(fn ($t) => [
            'id'       => $t->id,
            'name'     => $t->user?->name ?? "Tech#{$t->id}",
            'open_wos' => (int) ($techWoCounts[$t->id] ?? 0),
        ])->sortBy('open_wos')->values();

        // 3. Build asset context for Groq
        $assetLines = $assets->map(function ($a) use ($statsByAsset) {
            $stats    = $statsByAsset[$a->id] ?? ['total' => 0, 'open' => 0, 'critical' => 0, 'overdue' => 0];
            $risk     = ($stats['critical'] >= 2 || $stats['total'] >= 5) ? 'high'
                : (($stats['critical'] >= 1 || $stats['total'] >= 3) ? 'medium' : 'low');
            $type     = $a->assetType?->name ?? 'General Equipment';
            return "ID:{$a->id} | {$a->name} ({$type}) | risk:{$risk} | total_wos:{$stats['total']} open:{$stats['open']} critical:{$stats['critical']} overdue:{$stats['overdue']}";
        })->join("\n");

        $techContext = $techLines->map(fn ($t) => "ID:{$t['id']} | {$t['name']} | open_wos:{$t['open_wos']}")->join("\n");
        $today       = now()->format('Y-m-d');

        $prompt = "You are a certified CMMS maintenance planner. Generate preventive maintenance plans for each asset below.\n"
            . "Today: {$today}\n\n"
            . "ASSETS:\n{$assetLines}\n\n"
            . "AVAILABLE TECHNICIANS (sorted by availability):\n{$techContext}\n\n"
            . "Rules:\n"
            . "- High risk assets: priority=high, interval=1 month, next_run_at within 7 days\n"
            . "- Medium risk: priority=medium, interval=3 months, next_run_at within 30 days\n"
            . "- Low risk: priority=low, interval=6 months, next_run_at within 60 days\n"
            . "- Assign the technician with fewest open WOs (use their ID)\n"
            . "- Generate 6-8 specific, professional maintenance tasks per asset\n"
            . "- estimated_minutes: 60 for simple, 120 for medium, 240 for complex equipment\n"
            . "- status: 'active' for high risk, 'draft' for others\n\n"
            . "Return ONLY a JSON object:\n"
            . '{"plans":[{"asset_id":1,"asset_name":"...","name":"...","description":"...","priority":"high","status":"active","estimated_minutes":120,"interval_value":1,"interval_unit":"months","next_run_at":"YYYY-MM-DD","assigned_member_id":3,"assigned_member_name":"...","tasks":["task1","task2",...]}]}';

        try {
            $response = Http::withoutVerifying()
                ->withHeaders($this->headers())
                ->timeout(60)
                ->post(self::API_URL, [
                    'model'           => self::MODEL,
                    'messages'        => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens'      => 4096,
                    'response_format' => ['type' => 'json_object'],
                ]);

            if ($response->failed()) return ['plans' => [], 'error' => 'AI generation failed.'];

            $data = json_decode($response->json('choices.0.message.content') ?? '{}', true);
            return ['plans' => $data['plans'] ?? []];
        } catch (\Exception $e) {
            Log::error('toolSuggestPmPlans error: ' . $e->getMessage());
            return ['plans' => [], 'error' => $e->getMessage()];
        }
    }

    // ── Bulk PM Plan Creation ──────────────────────────────────────────────────

    public function bulkCreatePmPlans(Request $request): JsonResponse
    {
        $request->validate([
            'plans'                          => 'required|array|min:1',
            'plans.*.asset_id'               => 'required|integer',
            'plans.*.name'                   => 'required|string|max:255',
            'plans.*.description'            => 'nullable|string',
            'plans.*.priority'               => 'required|in:low,medium,high,critical',
            'plans.*.status'                 => 'required|in:active,inactive,draft',
            'plans.*.estimated_minutes'      => 'nullable|integer',
            'plans.*.interval_value'         => 'required|integer|min:1',
            'plans.*.interval_unit'          => 'required|in:days,weeks,months',
            'plans.*.next_run_at'            => 'nullable|date',
            'plans.*.assigned_member_id'     => 'nullable|integer',
            'plans.*.tasks'                  => 'nullable|array',
            'plans.*.tasks.*'                => 'string|max:500',
        ]);

        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['error' => 'Company context missing.'], 400);
        }

        $created = [];
        $errors  = [];
        $count   = PmPlan::where('company_id', $currentCompany->id)->withTrashed()->count();

        foreach ($request->input('plans') as $index => $planData) {
            // Verify asset belongs to company
            $assetExists = Asset::where('id', $planData['asset_id'])
                ->where('company_id', $currentCompany->id)
                ->exists();

            if (! $assetExists) {
                $errors[] = "Plan #{$index}: asset not found.";
                continue;
            }

            try {
                $count++;
                $code = 'PM-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);

                $plan = \Illuminate\Support\Facades\DB::transaction(function () use ($planData, $currentCompany, $currentMember, $code) {
                    $plan = PmPlan::create([
                        'company_id'           => $currentCompany->id,
                        'code'                 => $code,
                        'name'                 => $planData['name'],
                        'description'          => $planData['description'] ?? null,
                        'status'               => $planData['status'],
                        'priority'             => $planData['priority'],
                        'estimated_minutes'    => $planData['estimated_minutes'] ?? null,
                        'created_by_member_id' => $currentMember->id,
                        'assigned_member_id'   => $planData['assigned_member_id'] ?? null,
                    ]);

                    $plan->assets()->sync([$planData['asset_id']]);

                    $plan->triggers()->create([
                        'trigger_type'   => 'time_based',
                        'interval_value' => $planData['interval_value'],
                        'interval_unit'  => $planData['interval_unit'],
                        'next_run_at'    => $planData['next_run_at'] ?? null,
                    ]);

                    foreach ($planData['tasks'] ?? [] as $idx => $taskTitle) {
                        PmTask::create([
                            'pm_plan_id'  => $plan->id,
                            'title'       => $taskTitle,
                            'order_index' => $idx,
                        ]);
                    }

                    return $plan;
                });

                $created[] = [
                    'code'       => $plan->code,
                    'name'       => $plan->name,
                    'asset_id'   => $planData['asset_id'],
                    'asset_name' => $planData['asset_name'] ?? '',
                ];
            } catch (\Exception $e) {
                Log::error('bulkCreatePmPlans error: ' . $e->getMessage());
                $errors[] = "Plan #{$index}: " . $e->getMessage();
            }
        }

        return response()->json([
            'created_count' => count($created),
            'created'       => $created,
            'errors'        => $errors,
        ], count($created) > 0 ? 201 : 422);
    }

    private function toolAnalyzeAssetHealth(array $args, int $companyId): array
    {
        $query = WorkOrder::query()
            ->where('company_id', $companyId)
            ->where('created_at', '>=', now()->subDays(90))
            ->with('asset:id,name');

        if (! empty($args['asset_id'])) {
            $query->where('asset_id', (int) $args['asset_id']);
        }

        return $query->get()
            ->groupBy('asset_id')
            ->map(fn ($wos, $assetId) => [
                'asset_id'     => $assetId,
                'asset_name'   => $wos->first()->asset?->name ?? 'Unknown',
                'total_wos'    => $wos->count(),
                'open_wos'     => $wos->whereIn('status', ['open', 'in_progress', 'on_hold'])->count(),
                'critical_wos' => $wos->where('priority', 'critical')->count(),
                'overdue_wos'  => $wos->filter(fn ($wo) => $wo->due_at && $wo->due_at->isPast() && ! in_array($wo->status, ['completed', 'cancelled']))->count(),
                'risk_level'   => $this->calcRiskLevel($wos->count(), $wos->where('priority', 'critical')->count()),
            ])
            ->sortByDesc('total_wos')
            ->take(10)
            ->values()
            ->toArray();
    }

    private function calcRiskLevel(int $total, int $critical): string
    {
        if ($critical >= 2 || $total >= 5) return 'high';
        if ($critical >= 1 || $total >= 3) return 'medium';
        return 'low';
    }

    private function toolDetectAnomalies(int $companyId): array
    {
        $anomalies = [];

        WorkOrder::where('company_id', $companyId)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->with(['asset:id,name', 'assignedMember.user:id,name'])
            ->orderByRaw("FIELD(priority,'critical','high','medium','low')")
            ->limit(10)
            ->get()
            ->each(function ($wo) use (&$anomalies) {
                $anomalies[] = [
                    'type'        => 'overdue_wo',
                    'severity'    => in_array($wo->priority, ['critical', 'high']) ? 'critical' : 'warning',
                    'message'     => "WO \"{$wo->title}\" is overdue — was due " . $wo->due_at->diffForHumans(),
                    'asset'       => $wo->asset?->name,
                    'assigned_to' => $wo->assignedMember?->user?->name,
                    'wo_id'       => $wo->id,
                ];
            });

        WorkOrder::where('company_id', $companyId)
            ->where('created_at', '>=', now()->subDays(30))
            ->with('asset:id,name')
            ->get()
            ->groupBy('asset_id')
            ->each(function ($wos, $assetId) use (&$anomalies) {
                if ($wos->count() >= 3) {
                    $anomalies[] = [
                        'type'     => 'repeated_failures',
                        'severity' => 'warning',
                        'message'  => "Asset \"{$wos->first()->asset?->name}\" had {$wos->count()} WOs in 30 days",
                        'asset'    => $wos->first()->asset?->name,
                        'asset_id' => $assetId,
                        'count'    => $wos->count(),
                    ];
                }
            });

        $techIds  = Member::where('company_id', $companyId)
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->pluck('id');

        $woCounts = WorkOrder::whereIn('assigned_member_id', $techIds)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->groupBy('assigned_member_id')
            ->selectRaw('assigned_member_id, count(*) as count')
            ->pluck('count', 'assigned_member_id');

        Member::whereIn('id', $techIds)->with('user:id,name')->get()
            ->filter(fn ($t) => ($woCounts[$t->id] ?? 0) >= 5)
            ->each(function ($tech) use (&$anomalies, $woCounts) {
                $count       = $woCounts[$tech->id];
                $anomalies[] = [
                    'type'        => 'overloaded_technician',
                    'severity'    => 'info',
                    'message'     => ($tech->user?->name ?? 'A technician') . " has {$count} open work orders",
                    'assigned_to' => $tech->user?->name,
                    'count'       => $count,
                ];
            });

        return $anomalies;
    }
}
