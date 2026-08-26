<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Item;
use App\Models\Member;
use App\Models\StockMove;
use App\Models\Warehouse;
use App\Models\WorkOrder;
use App\Models\WorkOrderActivity;
use App\Models\WorkOrderAttachment;
use App\Models\WorkOrderChecklistItem;
use App\Models\WorkOrderComment;
use App\Models\WorkOrderStatusHistory;
use App\Models\WorkLog;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Adds rich data to existing work orders:
 *   - Checklist items (some completed)
 *   - Comments from different roles
 *   - Work logs with time tracking
 *   - Parts used (stock moves linked to WO)
 *   - Fake attachment records
 *   - Activity entries
 *   - Status history transitions
 *
 * Run AFTER DemoWorkOrderSeeder and DemoInventorySeeder:
 *   php artisan db:seed --class=DemoWorkOrderRichDataSeeder
 */
class DemoWorkOrderRichDataSeeder extends Seeder
{
    // ── Comment pools ────────────────────────────────────────────────────────

    private array $managerComments = [
        'Please prioritize this one — production is impacted.',
        'Team, what is the current status? Any blockers?',
        'Make sure to document all parts used before closing.',
        'Good progress. Notify me as soon as this is completed.',
        'We need this done before end of shift. Escalate if needed.',
        'Check with the supplier for the correct replacement part spec.',
        'Do not close this WO until the safety test is verified.',
        'Attached the technical manual for reference. Check the attachment.',
    ];

    private array $technicianComments = [
        'Work started. Isolating the equipment now.',
        'Found additional wear on the secondary bearing — will replace both.',
        'Waiting on the spare part from the main warehouse.',
        'Completed the inspection. Fault confirmed in the motor winding.',
        'Repair done. Running a test cycle now to verify.',
        'Part replaced successfully. Machine is back in normal operation.',
        'Oil level was critically low — topped up and documented.',
        'Noticed a hairline crack on the casing. Added to observations.',
        'All checklist items completed. Ready for manager sign-off.',
        'Had to put on hold — need a specific torque wrench from Site B.',
    ];

    private array $adminComments = [
        'Work order reviewed and approved.',
        'Please update the failure code before closing.',
        'Confirmed receipt of the parts from purchasing.',
        'Added to the monthly maintenance report.',
    ];

    // ── Checklist pools ──────────────────────────────────────────────────────

    private array $checklistSets = [
        'electrical' => [
            'Lock out / tag out (LOTO) applied',
            'Inspect panel for signs of overheating or burn marks',
            'Test all circuit breakers for correct tripping',
            'Check wire connections and terminal tightness',
            'Measure voltage and current draw on all phases',
            'Inspect grounding connections',
            'Test emergency shutdown circuit',
            'Re-energize and verify normal operation',
        ],
        'mechanical' => [
            'Isolate and de-energize equipment',
            'Inspect for visible damage, cracks, or leaks',
            'Measure vibration and temperature',
            'Lubricate all bearings and moving parts',
            'Check belt / coupling alignment',
            'Inspect seals and gaskets',
            'Tighten all fasteners to spec',
            'Run equipment under load and verify normal operation',
        ],
        'hvac' => [
            'Replace air filters',
            'Clean evaporator and condenser coils',
            'Check refrigerant charge level',
            'Inspect electrical connections',
            'Lubricate fan motors and bearings',
            'Test thermostat calibration',
            'Check drain pans and condensate lines',
            'Verify airflow in all zones',
        ],
        'pump' => [
            'Check pump seals for leaks',
            'Measure suction and discharge pressure',
            'Inspect impeller for wear or cavitation damage',
            'Verify motor alignment and coupling condition',
            'Check oil level in mechanical seal pot',
            'Test flow rate against design spec',
            'Inspect check valve operation',
            'Document pressure readings',
        ],
        'preventive' => [
            'Clean all equipment surfaces and work area',
            'Lubricate all moving parts per lubrication schedule',
            'Inspect for wear, corrosion, and loose connections',
            'Check all fluid levels (oil, coolant, hydraulic)',
            'Tighten fasteners and verify torque values',
            'Test all safety guards and emergency stops',
            'Run equipment under normal load for 10 minutes',
            'Document completion, observations, and next service date',
        ],
        'inspection' => [
            'Visual inspection of all major components',
            'Check for unusual noise or vibration',
            'Inspect all safety guards and covers',
            'Review maintenance history log',
            'Take temperature readings with thermal camera',
            'Check fluid levels and quality',
            'Document findings with photos',
            'Issue corrective action if required',
        ],
        'repair' => [
            'Identify and confirm root cause of failure',
            'Gather all required tools and spare parts',
            'Apply LOTO procedure',
            'Remove and replace faulty component',
            'Reassemble and verify correct installation',
            'Test repaired component under load',
            'Run equipment under normal conditions for 30 minutes',
            'Document parts used and repair details',
        ],
    ];

    private array $defaultChecklist = [
        'Inspect equipment for visible damage or leaks',
        'Check all connections and fastenings',
        'Perform required repair or maintenance task',
        'Test operation and verify normal function',
        'Clean equipment and surrounding work area',
        'Document findings, actions taken, and parts used',
    ];

    // ── Attachment fake names ────────────────────────────────────────────────

    private array $attachmentFiles = [
        ['original_name' => 'technical_manual_v3.pdf',     'mime_type' => 'application/pdf',  'size_bytes' => 2_450_000],
        ['original_name' => 'inspection_report.pdf',        'mime_type' => 'application/pdf',  'size_bytes' => 890_000],
        ['original_name' => 'photo_before_repair.jpg',      'mime_type' => 'image/jpeg',       'size_bytes' => 1_340_000],
        ['original_name' => 'photo_after_repair.jpg',       'mime_type' => 'image/jpeg',       'size_bytes' => 1_180_000],
        ['original_name' => 'wiring_diagram.png',           'mime_type' => 'image/png',        'size_bytes' => 620_000],
        ['original_name' => 'parts_list.xlsx',              'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'size_bytes' => 38_000],
        ['original_name' => 'safety_checklist_signed.pdf',  'mime_type' => 'application/pdf',  'size_bytes' => 340_000],
        ['original_name' => 'vibration_readings.pdf',       'mime_type' => 'application/pdf',  'size_bytes' => 210_000],
        ['original_name' => 'motor_nameplate.jpg',          'mime_type' => 'image/jpeg',       'size_bytes' => 480_000],
        ['original_name' => 'fault_log_export.csv',         'mime_type' => 'text/csv',         'size_bytes' => 18_000],
    ];

    // ── Work log notes ───────────────────────────────────────────────────────

    private array $workLogNotes = [
        'Initial diagnosis and root cause identification.',
        'Disassembly and component inspection.',
        'Replacement of faulty part and reassembly.',
        'Testing and commissioning after repair.',
        'Lubrication and preventive maintenance tasks.',
        'Documentation and closure activities.',
        'Waiting for parts delivery — on-site standby.',
        'Calibration and measurement verification.',
    ];

    // ── Main run ─────────────────────────────────────────────────────────────

    public function run(): void
    {
        $companies = Company::query()
            ->where('approval_status', 'approved')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No approved active companies found.');
            return;
        }

        foreach ($companies as $company) {
            $workOrders = WorkOrder::query()
                ->where('company_id', $company->id)
                ->whereNull('deleted_at')
                ->get();

            if ($workOrders->isEmpty()) {
                $this->command->warn("No work orders for {$company->name} — skipping.");
                continue;
            }

            $members = Member::query()
                ->where('company_id', $company->id)
                ->where('status', 'active')
                ->with('roles')
                ->get();

            if ($members->isEmpty()) {
                $this->command->warn("No members for {$company->name} — skipping.");
                continue;
            }

            $managers    = $members->filter(fn($m) => $m->roles->pluck('code')->contains('manager'));
            $technicians = $members->filter(fn($m) => $m->roles->pluck('code')->contains('technician'));
            $admins      = $members->filter(fn($m) => $m->roles->pluck('code')->contains('admin'));

            $allActors = $members;

            // Inventory items and warehouses for this company
            $items      = Item::query()->where('company_id', $company->id)->where('is_stocked', true)->get();
            $warehouses = Warehouse::query()->where('company_id', $company->id)->get();

            $woCount = 0;

            foreach ($workOrders as $wo) {
                $baseAt = $wo->opened_at ?? $wo->created_at ?? Carbon::now()->subDays(30);

                // ── 1. Checklist items ────────────────────────────────────
                $this->seedChecklist($wo, $baseAt);

                // ── 2. Status history ─────────────────────────────────────
                $this->seedStatusHistory($wo, $allActors, $managers, $baseAt);

                // ── 3. Comments from different roles ──────────────────────
                $this->seedComments($wo, $managers, $technicians, $admins, $allActors, $baseAt);

                // ── 4. Work logs ──────────────────────────────────────────
                $this->seedWorkLogs($wo, $technicians->isNotEmpty() ? $technicians : $allActors, $baseAt);

                // ── 5. Parts used (stock moves linked to WO) ──────────────
                if ($items->isNotEmpty() && $warehouses->isNotEmpty()) {
                    $this->seedParts($wo, $company, $items, $warehouses, $allActors, $baseAt);
                }

                // ── 6. Attachment records ─────────────────────────────────
                $this->seedAttachments($wo, $allActors, $baseAt);

                // ── 7. Activity entries ───────────────────────────────────
                $this->seedActivities($wo, $allActors, $baseAt);

                $woCount++;
            }

            $this->command->info("Enriched {$woCount} work orders for: {$company->name}");
        }
    }

    // ── Checklist ─────────────────────────────────────────────────────────────

    private function seedChecklist(WorkOrder $wo, Carbon $baseAt): void
    {
        // Skip if already has checklist items
        if ($wo->checklistItems()->exists()) {
            // Just ensure some are marked complete for non-open WOs
            if (in_array($wo->status, ['completed', 'in_progress'])) {
                $items = $wo->checklistItems()->get();
                $completeCount = $wo->status === 'completed' ? $items->count() : (int) ceil($items->count() * 0.6);
                foreach ($items->take($completeCount) as $item) {
                    if (! $item->is_completed) {
                        $item->update([
                            'is_completed' => true,
                            'completed_at' => $baseAt->copy()->addHours(rand(2, 24)),
                        ]);
                    }
                }
            }
            return;
        }

        $tasks = $this->getChecklistForWo($wo);

        foreach ($tasks as $index => $title) {
            $isCompleted = false;
            $completedAt = null;

            if ($wo->status === 'completed') {
                $isCompleted = true;
                $completedAt = $baseAt->copy()->addHours(rand(2, 48));
            } elseif ($wo->status === 'in_progress') {
                $isCompleted = $index < (int) ceil(count($tasks) * 0.6);
                $completedAt = $isCompleted ? $baseAt->copy()->addHours(rand(1, 12)) : null;
            }

            WorkOrderChecklistItem::create([
                'work_order_id'          => $wo->id,
                'title'                  => $title,
                'is_completed'           => $isCompleted,
                'completed_at'           => $completedAt,
                'completed_by_member_id' => null,
                'order_index'            => $index,
                'created_at'             => $baseAt,
                'updated_at'             => $completedAt ?? $baseAt,
            ]);
        }
    }

    private function getChecklistForWo(WorkOrder $wo): array
    {
        $haystack = strtolower($wo->title . ' ' . ($wo->description ?? ''));

        foreach ($this->checklistSets as $keyword => $tasks) {
            if (str_contains($haystack, $keyword)) {
                return $tasks;
            }
        }

        // Keyword fallbacks
        $keywordMap = [
            'pump'        => 'pump',
            'motor'       => 'mechanical',
            'bearing'     => 'mechanical',
            'compressor'  => 'mechanical',
            'belt'        => 'mechanical',
            'filter'      => 'preventive',
            'lubricate'   => 'preventive',
            'inspect'     => 'inspection',
            'annual'      => 'inspection',
            'quarterly'   => 'preventive',
            'electrical'  => 'electrical',
            'circuit'     => 'electrical',
            'wiring'      => 'electrical',
            'relay'       => 'electrical',
            'chiller'     => 'hvac',
            'hvac'        => 'hvac',
            'cooling'     => 'hvac',
            'repair'      => 'repair',
            'replace'     => 'repair',
            'overhaul'    => 'repair',
        ];

        foreach ($keywordMap as $needle => $set) {
            if (str_contains($haystack, $needle)) {
                return $this->checklistSets[$set];
            }
        }

        return $this->defaultChecklist;
    }

    // ── Status history ────────────────────────────────────────────────────────

    private function seedStatusHistory(WorkOrder $wo, $allActors, $managers, Carbon $baseAt): void
    {
        // Skip if already has history
        if (\Illuminate\Support\Facades\DB::table('work_order_status_history')->where('work_order_id', $wo->id)->exists()) {
            return;
        }

        $actor = $managers->isNotEmpty() ? $managers->random() : $allActors->random();

        $transitions = match ($wo->status) {
            'in_progress' => [
                ['old' => 'open', 'new' => 'in_progress', 'offsetHours' => 2],
            ],
            'on_hold' => [
                ['old' => 'open',        'new' => 'in_progress', 'offsetHours' => 2],
                ['old' => 'in_progress', 'new' => 'on_hold',     'offsetHours' => 6],
            ],
            'completed' => [
                ['old' => 'open',        'new' => 'in_progress', 'offsetHours' => 1],
                ['old' => 'in_progress', 'new' => 'completed',   'offsetHours' => 24],
            ],
            'cancelled' => [
                ['old' => 'open', 'new' => 'cancelled', 'offsetHours' => 3],
            ],
            default => [],
        };

        foreach ($transitions as $t) {
            \Illuminate\Support\Facades\DB::table('work_order_status_history')->insert([
                'work_order_id'        => $wo->id,
                'changed_by_member_id' => $actor->id,
                'old_status'           => $t['old'],
                'new_status'           => $t['new'],
                'note'                 => null,
                'changed_at'           => $baseAt->copy()->addHours($t['offsetHours']),
            ]);
        }
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    private function seedComments(WorkOrder $wo, $managers, $technicians, $admins, $allActors, Carbon $baseAt): void
    {
        // Skip if already has comments
        if ($wo->comments()->exists()) {
            return;
        }

        $commentCount = match ($wo->status) {
            'completed'   => rand(4, 6),
            'in_progress' => rand(2, 4),
            'on_hold'     => rand(2, 3),
            default       => rand(1, 2),
        };

        $offset = 1;

        for ($i = 0; $i < $commentCount; $i++) {
            // Alternate between roles: manager → technician → admin → technician…
            if ($i % 3 === 0 && $managers->isNotEmpty()) {
                $author  = $managers->random();
                $body    = $this->managerComments[array_rand($this->managerComments)];
            } elseif ($i % 3 === 2 && $admins->isNotEmpty()) {
                $author  = $admins->random();
                $body    = $this->adminComments[array_rand($this->adminComments)];
            } else {
                $author  = $technicians->isNotEmpty() ? $technicians->random() : $allActors->random();
                $body    = $this->technicianComments[array_rand($this->technicianComments)];
            }

            $commentAt = $baseAt->copy()->addHours($offset);
            $offset += rand(1, 8);

            WorkOrderComment::create([
                'work_order_id' => $wo->id,
                'member_id'     => $author->id,
                'body'          => $body,
                'created_at'    => $commentAt,
                'updated_at'    => $commentAt,
            ]);
        }
    }

    // ── Work logs ─────────────────────────────────────────────────────────────

    private function seedWorkLogs(WorkOrder $wo, $technicians, Carbon $baseAt): void
    {
        // Skip if already has work logs
        if (WorkLog::where('work_order_id', $wo->id)->exists()) {
            return;
        }

        // Only for WOs that have been worked on
        if (! in_array($wo->status, ['in_progress', 'on_hold', 'completed'])) {
            return;
        }

        $logCount = $wo->status === 'completed' ? rand(2, 4) : rand(1, 2);
        $actor    = $technicians->isNotEmpty() ? $technicians->random() : null;
        if (! $actor) return;

        $logAt = $baseAt->copy()->addHours(2);

        for ($i = 0; $i < $logCount; $i++) {
            $laborMinutes = [30, 45, 60, 90, 120, 150, 180, 240][rand(0, 7)];
            $startedAt    = $logAt->copy();
            $endedAt      = $startedAt->copy()->addMinutes($laborMinutes);

            WorkLog::create([
                'work_order_id' => $wo->id,
                'member_id'     => $actor->id,
                'started_at'    => $startedAt,
                'ended_at'      => $endedAt,
                'labor_minutes' => $laborMinutes,
                'labor_cost'    => null,
                'is_billable'   => false,
                'notes'         => $this->workLogNotes[$i % count($this->workLogNotes)],
                'created_at'    => $startedAt,
                'updated_at'    => $endedAt,
            ]);

            $logAt->addHours(rand(3, 12));
        }
    }

    // ── Parts used ────────────────────────────────────────────────────────────

    private function seedParts(
        WorkOrder $wo,
        $company,
        $items,
        $warehouses,
        $allActors,
        Carbon $baseAt
    ): void {
        // Skip if this WO already has linked stock moves
        if (StockMove::where('work_order_id', $wo->id)->exists()) {
            return;
        }

        // Only seed parts for WOs that are in progress or completed
        if (! in_array($wo->status, ['in_progress', 'completed'])) {
            return;
        }

        $partCount = rand(1, 3);
        $actor     = $allActors->random();
        $warehouse = $warehouses->random();
        $usedItems = $items->random(min($partCount, $items->count()));

        foreach (collect([$usedItems])->flatten(0) as $item) {
            // Check if there's any stock to draw from
            $available = (float) StockMove::query()
                ->where('item_id', $item->id)
                ->where('warehouse_id', $warehouse->id)
                ->sum('quantity');

            if ($available <= 0) {
                // Add a small stock first so we can draw from it
                StockMove::create([
                    'company_id'           => $company->id,
                    'item_id'              => $item->id,
                    'warehouse_id'         => $warehouse->id,
                    'work_order_id'        => null,
                    'created_by_member_id' => $actor->id,
                    'move_type'            => 'in',
                    'quantity'             => 20,
                    'reference'            => 'AUTO-STOCK-' . now()->format('Ymd'),
                    'moved_at'             => $baseAt->copy()->subDays(5),
                    'notes'                => 'Stock replenishment for demo data.',
                ]);
            }

            $qty = (float) rand(1, 3);

            StockMove::create([
                'company_id'           => $company->id,
                'item_id'              => $item->id,
                'warehouse_id'         => $warehouse->id,
                'work_order_id'        => $wo->id,
                'created_by_member_id' => $actor->id,
                'move_type'            => 'out',
                'quantity'             => -$qty,
                'reference'            => 'WO-PART-' . $wo->code,
                'moved_at'             => $baseAt->copy()->addHours(rand(2, 10)),
                'notes'                => "Used during {$wo->code}",
            ]);
        }
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    private function seedAttachments(WorkOrder $wo, $allActors, Carbon $baseAt): void
    {
        // Skip if already has attachments
        if (WorkOrderAttachment::where('work_order_id', $wo->id)->exists()) {
            return;
        }

        // Only completed and in-progress WOs get attachments
        if (! in_array($wo->status, ['completed', 'in_progress', 'on_hold'])) {
            return;
        }

        $count  = $wo->status === 'completed' ? rand(2, 3) : 1;
        $actor  = $allActors->random();
        $pool   = $this->attachmentFiles;
        shuffle($pool);

        foreach (array_slice($pool, 0, $count) as $file) {
            $ext    = pathinfo($file['original_name'], PATHINFO_EXTENSION);
            $stored = 'work_orders/' . $wo->id . '/' . uniqid() . '.' . $ext;

            WorkOrderAttachment::create([
                'work_order_id' => $wo->id,
                'member_id'     => $actor->id,
                'original_name' => $file['original_name'],
                'stored_path'   => $stored,
                'mime_type'     => $file['mime_type'],
                'size_bytes'    => $file['size_bytes'],
                'created_at'    => $baseAt->copy()->addHours(rand(1, 20)),
                'updated_at'    => $baseAt->copy()->addHours(rand(1, 20)),
            ]);
        }
    }

    // ── Activity ──────────────────────────────────────────────────────────────

    private function seedActivities(WorkOrder $wo, $allActors, Carbon $baseAt): void
    {
        // Skip if already has activity entries
        if (WorkOrderActivity::where('work_order_id', $wo->id)->exists()) {
            return;
        }

        $actor = $allActors->random();

        $events = [];

        // created
        $events[] = [
            'type'       => 'created',
            'actor'      => $allActors->random()->id,
            'meta'       => ['status' => 'open', 'priority' => $wo->priority],
            'offsetHrs'  => 0,
        ];

        // assigned
        if ($wo->assigned_member_id) {
            $events[] = [
                'type'      => 'assigned',
                'actor'     => $actor->id,
                'meta'      => ['member_id' => $wo->assigned_member_id],
                'offsetHrs' => 0.5,
            ];
        }

        // status transitions
        if (in_array($wo->status, ['in_progress', 'completed', 'on_hold', 'cancelled'])) {
            $events[] = [
                'type'      => 'status_changed',
                'actor'     => $actor->id,
                'meta'      => ['from' => 'open', 'to' => 'in_progress'],
                'offsetHrs' => 2,
            ];
        }

        if (in_array($wo->status, ['completed'])) {
            $events[] = [
                'type'      => 'status_changed',
                'actor'     => $actor->id,
                'meta'      => ['from' => 'in_progress', 'to' => 'completed'],
                'offsetHrs' => 26,
            ];
        }

        if ($wo->status === 'on_hold') {
            $events[] = [
                'type'      => 'status_changed',
                'actor'     => $actor->id,
                'meta'      => ['from' => 'in_progress', 'to' => 'on_hold'],
                'offsetHrs' => 8,
            ];
        }

        // comment_added
        $events[] = [
            'type'      => 'comment_added',
            'actor'     => $allActors->random()->id,
            'meta'      => ['preview' => 'Work started. Isolating the equipment now.'],
            'offsetHrs' => 3,
        ];

        // work_log_added
        if (in_array($wo->status, ['in_progress', 'completed', 'on_hold'])) {
            $events[] = [
                'type'      => 'work_log_added',
                'actor'     => $actor->id,
                'meta'      => ['labor_minutes' => 90],
                'offsetHrs' => 4,
            ];
        }

        // attachment_added
        if (in_array($wo->status, ['completed', 'in_progress', 'on_hold'])) {
            $events[] = [
                'type'      => 'attachment_added',
                'actor'     => $allActors->random()->id,
                'meta'      => ['file_name' => 'inspection_report.pdf'],
                'offsetHrs' => 5,
            ];
        }

        // part_used
        if (in_array($wo->status, ['in_progress', 'completed'])) {
            $events[] = [
                'type'      => 'part_used',
                'actor'     => $actor->id,
                'meta'      => ['item_name' => 'Ball Bearing 6205', 'quantity' => 2, 'unit' => 'pcs'],
                'offsetHrs' => 6,
            ];
        }

        foreach ($events as $event) {
            WorkOrderActivity::create([
                'work_order_id'   => $wo->id,
                'actor_member_id' => $event['actor'],
                'type'            => $event['type'],
                'meta'            => $event['meta'],
                'created_at'      => $baseAt->copy()->addHours($event['offsetHrs']),
            ]);
        }
    }
}
