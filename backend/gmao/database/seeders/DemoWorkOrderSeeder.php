<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Company;
use App\Models\Member;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Generates realistic work orders for all approved companies.
 * Run: php artisan db:seed --class=DemoWorkOrderSeeder
 */
class DemoWorkOrderSeeder extends Seeder
{
    private array $titles = [
        // Electrical
        'Replace faulty circuit breaker panel',
        'Inspect and rewire control cabinet',
        'Repair emergency lighting system',
        'Install new power distribution unit',
        'Fix electrical short in production line',
        'Replace burned-out motor starter',
        'Calibrate voltage regulators',
        'Repair ground fault circuit interrupter',

        // Mechanical
        'Overhaul hydraulic press cylinder',
        'Replace worn conveyor belt drive rollers',
        'Lubricate and inspect gearbox assembly',
        'Repair pneumatic actuator leak',
        'Replace compressor oil separator filter',
        'Realign pump coupling and shaft',
        'Inspect and replace bearing on fan motor',
        'Fix vibration issue on rotating equipment',

        // HVAC
        'Clean and service air handling unit',
        'Replace chiller condenser coils',
        'Repair refrigerant leak in cooling system',
        'Replace air filter banks — Zone B',
        'Service rooftop HVAC units quarterly',
        'Fix noisy exhaust fan in server room',
        'Recharge refrigerant on chiller unit',
        'Inspect ductwork insulation',

        // Plumbing / Utilities
        'Repair pressurized water line break',
        'Replace corroded gate valves',
        'Inspect and clean cooling tower',
        'Fix boiler pressure relief valve',
        'Unclog drain in production area',
        'Replace water pump mechanical seal',
        'Install backflow prevention device',

        // General
        'Preventive maintenance inspection — Line 3',
        'Annual safety compliance inspection',
        'Emergency repair after power outage',
        'Replace worn machine guard panels',
        'Calibrate pressure gauges on manifold',
        'Inspect fire suppression sprinkler system',
        'Replace forklift battery and charger',
        'Repair loading dock door mechanism',
        'Grease and inspect overhead crane rails',
        'Replace UV lamp in water treatment unit',
    ];

    private array $descriptions = [
        'Equipment was found inoperative during morning checks. Immediate repair required to resume production.',
        'Reported by shift supervisor. Intermittent failure causing production slowdown.',
        'Scheduled preventive maintenance as per quarterly plan.',
        'Vibration alarm triggered on SCADA. Investigation and repair needed.',
        'Oil leak detected during routine walkthrough. Safety hazard.',
        'Temperature sensor reading above threshold. Inspect cooling system.',
        'Noise complaint from operators. Bearing inspection required.',
        'Pressure drop observed on hydraulic circuit. Seal replacement likely needed.',
        'Routine annual inspection as per regulatory requirements.',
        'Follow-up repair after previous partial fix. Complete resolution required.',
    ];

    public function run(): void
    {
        $companies = Company::query()
            ->where('approval_status', 'approved')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No approved active companies found. Run DemoCompaniesUsersSeeder first.');
            return;
        }

        foreach ($companies as $company) {
            $assets = Asset::query()
                ->where('company_id', $company->id)
                ->whereNull('deleted_at')
                ->get();

            $members = Member::query()
                ->where('company_id', $company->id)
                ->where('status', 'active')
                ->get();

            if ($assets->isEmpty()) {
                $this->command->warn("No assets for company {$company->name} — skipping.");
                continue;
            }

            if ($members->isEmpty()) {
                $this->command->warn("No members for company {$company->name} — skipping.");
                continue;
            }

            $managers    = $members->filter(fn($m) => $m->roles->pluck('code')->contains('manager'));
            $technicians = $members->filter(fn($m) => $m->roles->pluck('code')->contains('technician'));

            // Fall back to any member if no specific roles yet
            $creatorPool  = $managers->isNotEmpty() ? $managers : $members;
            $assigneePool = $technicians->isNotEmpty() ? $technicians : $members;

            $woCounter = WorkOrder::query()
                ->where('company_id', $company->id)
                ->max(DB::raw("CAST(SUBSTRING_INDEX(code, '-', -1) AS UNSIGNED)")) ?? 0;

            $count = 0;

            foreach ($this->generateWorkOrderDefs() as $def) {
                $woCounter++;
                $code = 'WO-' . str_pad((string) $woCounter, 4, '0', STR_PAD_LEFT);

                $asset   = $assets->random();
                $creator = $creatorPool->random();

                // Avoid duplicate code for this company
                if (WorkOrder::query()->where('company_id', $company->id)->where('code', $code)->exists()) {
                    continue;
                }

                $openedAt = $def['opened_at'];
                $dueAt    = $def['due_at'];
                $closedAt = $def['closed_at'];

                $wo = WorkOrder::query()->create([
                    'company_id'            => $company->id,
                    'asset_id'              => $asset->id,
                    'code'                  => $code,
                    'created_by_member_id'  => $creator->id,
                    'closed_by_member_id'   => $closedAt ? $creator->id : null,
                    'status'                => $def['status'],
                    'priority'              => $def['priority'],
                    'title'                 => $def['title'],
                    'description'           => $def['description'],
                    'opened_at'             => $openedAt,
                    'due_at'                => $dueAt,
                    'closed_at'             => $closedAt,
                    'estimated_minutes'     => $def['estimated_minutes'],
                    'created_at'            => $openedAt,
                    'updated_at'            => $closedAt ?? $openedAt,
                ]);

                // Assign 1–2 technicians
                if ($assigneePool->isNotEmpty()) {
                    $assignees = $assigneePool->random(min(rand(1, 2), $assigneePool->count()));
                    $pivotData = collect(is_array($assignees->all()) ? $assignees : [$assignees])
                        ->mapWithKeys(fn($m) => [$m->id => ['assigned_at' => $openedAt]])
                        ->all();
                    $wo->assignedMembers()->sync($pivotData);
                }

                $count++;
            }

            $this->command->info("Created {$count} work orders for: {$company->name}");
        }
    }

    private function generateWorkOrderDefs(): array
    {
        $defs = [];
        $now  = Carbon::now();

        $statusSets = [
            // Recent open WOs (last 0–30 days, no due yet or due in future)
            ['status' => 'open',        'priority' => 'high',     'daysAgo' => 2,  'dueDays' => 5],
            ['status' => 'open',        'priority' => 'critical',  'daysAgo' => 1,  'dueDays' => 2],
            ['status' => 'open',        'priority' => 'medium',    'daysAgo' => 5,  'dueDays' => 10],
            ['status' => 'open',        'priority' => 'low',       'daysAgo' => 8,  'dueDays' => 20],
            ['status' => 'open',        'priority' => 'high',      'daysAgo' => 3,  'dueDays' => 7],
            ['status' => 'open',        'priority' => 'medium',    'daysAgo' => 10, 'dueDays' => 15],

            // In progress
            ['status' => 'in_progress', 'priority' => 'critical',  'daysAgo' => 1,  'dueDays' => 1],
            ['status' => 'in_progress', 'priority' => 'high',      'daysAgo' => 3,  'dueDays' => 4],
            ['status' => 'in_progress', 'priority' => 'medium',    'daysAgo' => 6,  'dueDays' => 9],
            ['status' => 'in_progress', 'priority' => 'high',      'daysAgo' => 2,  'dueDays' => 6],

            // On hold
            ['status' => 'on_hold',     'priority' => 'medium',    'daysAgo' => 12, 'dueDays' => 25],
            ['status' => 'on_hold',     'priority' => 'low',       'daysAgo' => 15, 'dueDays' => 30],

            // Overdue (due in the past, still open)
            ['status' => 'open',        'priority' => 'critical',  'daysAgo' => 10, 'dueDays' => -3],
            ['status' => 'open',        'priority' => 'high',      'daysAgo' => 14, 'dueDays' => -1],
            ['status' => 'in_progress', 'priority' => 'high',      'daysAgo' => 8,  'dueDays' => -2],

            // Completed this month
            ['status' => 'completed',   'priority' => 'high',      'daysAgo' => 20, 'dueDays' => -5,  'closedDaysAgo' => 5],
            ['status' => 'completed',   'priority' => 'medium',    'daysAgo' => 22, 'dueDays' => -7,  'closedDaysAgo' => 7],
            ['status' => 'completed',   'priority' => 'low',       'daysAgo' => 25, 'dueDays' => -10, 'closedDaysAgo' => 10],
            ['status' => 'completed',   'priority' => 'critical',  'daysAgo' => 18, 'dueDays' => -3,  'closedDaysAgo' => 3],
            ['status' => 'completed',   'priority' => 'high',      'daysAgo' => 16, 'dueDays' => -1,  'closedDaysAgo' => 1],
            ['status' => 'completed',   'priority' => 'medium',    'daysAgo' => 28, 'dueDays' => -12, 'closedDaysAgo' => 12],
            ['status' => 'completed',   'priority' => 'low',       'daysAgo' => 24, 'dueDays' => -8,  'closedDaysAgo' => 8],
            ['status' => 'completed',   'priority' => 'high',      'daysAgo' => 19, 'dueDays' => -4,  'closedDaysAgo' => 4],

            // Older completed (last 2–3 months, for the monthly chart)
            ['status' => 'completed',   'priority' => 'medium',    'daysAgo' => 45, 'dueDays' => -25, 'closedDaysAgo' => 25],
            ['status' => 'completed',   'priority' => 'high',      'daysAgo' => 50, 'dueDays' => -20, 'closedDaysAgo' => 20],
            ['status' => 'completed',   'priority' => 'low',       'daysAgo' => 60, 'dueDays' => -30, 'closedDaysAgo' => 30],
            ['status' => 'completed',   'priority' => 'critical',  'daysAgo' => 55, 'dueDays' => -22, 'closedDaysAgo' => 22],
            ['status' => 'completed',   'priority' => 'medium',    'daysAgo' => 75, 'dueDays' => -40, 'closedDaysAgo' => 40],
            ['status' => 'completed',   'priority' => 'high',      'daysAgo' => 80, 'dueDays' => -45, 'closedDaysAgo' => 45],
            ['status' => 'completed',   'priority' => 'low',       'daysAgo' => 90, 'dueDays' => -55, 'closedDaysAgo' => 55],
        ];

        $titlePool = $this->titles;
        shuffle($titlePool);
        $descPool = $this->descriptions;

        foreach ($statusSets as $i => $set) {
            $openedAt  = $now->copy()->subDays($set['daysAgo'])->subHours(rand(0, 8));
            $dueAt     = $now->copy()->addDays($set['dueDays']);
            $closedAt  = isset($set['closedDaysAgo'])
                ? $now->copy()->subDays($set['closedDaysAgo'])
                : null;

            $defs[] = [
                'status'             => $set['status'],
                'priority'           => $set['priority'],
                'title'              => $titlePool[$i % count($titlePool)],
                'description'        => $descPool[$i % count($descPool)],
                'opened_at'          => $openedAt,
                'due_at'             => $dueAt,
                'closed_at'          => $closedAt,
                'estimated_minutes'  => [60, 90, 120, 180, 240, 360, 480][rand(0, 6)],
            ];
        }

        return $defs;
    }
}
