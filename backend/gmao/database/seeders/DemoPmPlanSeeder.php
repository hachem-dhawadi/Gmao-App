<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Company;
use App\Models\Member;
use App\Models\PmPlan;
use App\Models\PmTrigger;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seeds realistic Preventive Maintenance plans per approved company.
 * Run: php artisan db:seed --class=DemoPmPlanSeeder
 */
class DemoPmPlanSeeder extends Seeder
{
    /** @var array<int, array<string, mixed>> */
    private array $planTemplates = [
        [
            'name'               => 'HVAC System Full Inspection',
            'description'        => 'Inspect filters, coils, belts, and refrigerant levels. Clean drain pans and check thermostat calibration.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 120,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 5,
        ],
        [
            'name'               => 'Air Compressor Oil Change',
            'description'        => 'Drain and replace compressor oil. Inspect oil separator element and air intake filter.',
            'priority'           => 'medium',
            'status'             => 'active',
            'estimated_minutes'  => 90,
            'interval_value'     => 3,
            'interval_unit'      => 'months',
            'offset_days'        => 12,
        ],
        [
            'name'               => 'Emergency Generator Load Test',
            'description'        => 'Run generator under 75% load for 30 minutes. Check fuel level, coolant, and battery charge.',
            'priority'           => 'critical',
            'status'             => 'active',
            'estimated_minutes'  => 60,
            'interval_value'     => 1,
            'interval_unit'      => 'weeks',
            'offset_days'        => 3,
        ],
        [
            'name'               => 'Pump Bearing Lubrication',
            'description'        => 'Apply grease to all pump bearing points. Check alignment and vibration levels.',
            'priority'           => 'medium',
            'status'             => 'active',
            'estimated_minutes'  => 45,
            'interval_value'     => 2,
            'interval_unit'      => 'weeks',
            'offset_days'        => 8,
        ],
        [
            'name'               => 'Electrical Panel Thermographic Scan',
            'description'        => 'Thermal imaging of all MCC and distribution panels. Document hot spots and schedule remediation.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 180,
            'interval_value'     => 6,
            'interval_unit'      => 'months',
            'offset_days'        => 45,
        ],
        [
            'name'               => 'Fire Suppression System Inspection',
            'description'        => 'Inspect sprinkler heads, FM200 cylinders, and control panel. Test flow switches and alarms.',
            'priority'           => 'critical',
            'status'             => 'active',
            'estimated_minutes'  => 150,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 20,
        ],
        [
            'name'               => 'Conveyor Belt Tension & Tracking',
            'description'        => 'Check belt tension and adjust tracking. Inspect idlers, pulleys, and scrapers for wear.',
            'priority'           => 'medium',
            'status'             => 'active',
            'estimated_minutes'  => 60,
            'interval_value'     => 2,
            'interval_unit'      => 'weeks',
            'offset_days'        => 6,
        ],
        [
            'name'               => 'Cooling Tower Cleaning & Water Treatment',
            'description'        => 'Clean fill media, basin, and drift eliminators. Test and adjust water chemistry (pH, biocide).',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 240,
            'interval_value'     => 3,
            'interval_unit'      => 'months',
            'offset_days'        => 30,
        ],
        [
            'name'               => 'Hydraulic System Filter Replacement',
            'description'        => 'Replace return-line and pressure filters. Check oil level and sample oil for analysis.',
            'priority'           => 'medium',
            'status'             => 'active',
            'estimated_minutes'  => 75,
            'interval_value'     => 2,
            'interval_unit'      => 'months',
            'offset_days'        => 15,
        ],
        [
            'name'               => 'UPS Battery Capacity Test',
            'description'        => 'Perform discharge test on all UPS battery strings. Replace any cells below 80% capacity.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 120,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 25,
        ],
        [
            'name'               => 'Forklift Daily Safety Check',
            'description'        => 'Inspect forks, hydraulic cylinders, brakes, lights, and horn. Check fluid levels and tire condition.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 30,
            'interval_value'     => 1,
            'interval_unit'      => 'weeks',
            'offset_days'        => 2,
        ],
        [
            'name'               => 'Chiller Refrigerant Level Check',
            'description'        => 'Verify refrigerant charge, check for leaks using electronic detector. Inspect evaporator and condenser.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 90,
            'interval_value'     => 3,
            'interval_unit'      => 'months',
            'offset_days'        => 40,
        ],
        [
            'name'               => 'Boiler Safety Valve Function Test',
            'description'        => 'Manually lift test all safety valves. Verify set pressure and re-seating. Inspect burner and flue.',
            'priority'           => 'critical',
            'status'             => 'active',
            'estimated_minutes'  => 180,
            'interval_value'     => 6,
            'interval_unit'      => 'months',
            'offset_days'        => 60,
        ],
        [
            'name'               => 'AHU Filter Replacement',
            'description'        => 'Replace G4 pre-filters and F7 bag filters in all air handling units. Record differential pressure.',
            'priority'           => 'medium',
            'status'             => 'active',
            'estimated_minutes'  => 90,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 10,
        ],
        [
            'name'               => 'Water Treatment System Dosing Check',
            'description'        => 'Test chemical dosing pump rates. Check inhibitor and biocide tank levels. Log conductivity and pH.',
            'priority'           => 'medium',
            'status'             => 'active',
            'estimated_minutes'  => 45,
            'interval_value'     => 2,
            'interval_unit'      => 'weeks',
            'offset_days'        => 9,
        ],
        [
            'name'               => 'Emergency Lighting Function Test',
            'description'        => 'Test all emergency luminaires for minimum 3-hour duration. Replace failed batteries and bulbs.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 60,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 18,
        ],
        [
            'name'               => 'Overhead Crane Wire Rope Inspection',
            'description'        => 'Inspect wire rope for broken wires, kinking, and corrosion. Lubricate rope and check sheaves.',
            'priority'           => 'critical',
            'status'             => 'active',
            'estimated_minutes'  => 120,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 22,
        ],
        [
            'name'               => 'Pneumatic System Leak Detection',
            'description'        => 'Use ultrasonic detector to locate compressed air leaks. Tag and repair leaks above 5 l/min.',
            'priority'           => 'medium',
            'status'             => 'draft',
            'estimated_minutes'  => 90,
            'interval_value'     => 1,
            'interval_unit'      => 'months',
            'offset_days'        => 35,
        ],
        [
            'name'               => 'Transformer Oil Dielectric Test',
            'description'        => 'Sample transformer oil for dielectric strength, moisture, and dissolved gas analysis.',
            'priority'           => 'high',
            'status'             => 'active',
            'estimated_minutes'  => 60,
            'interval_value'     => 6,
            'interval_unit'      => 'months',
            'offset_days'        => 75,
        ],
        [
            'name'               => 'Roof Drainage System Inspection',
            'description'        => 'Clear debris from gutters, downpipes, and drains. Inspect roof membrane for ponding or damage.',
            'priority'           => 'low',
            'status'             => 'inactive',
            'estimated_minutes'  => 90,
            'interval_value'     => 3,
            'interval_unit'      => 'months',
            'offset_days'        => 50,
        ],
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
            $existing = PmPlan::query()->where('company_id', $company->id)->count();
            if ($existing >= count($this->planTemplates)) {
                $this->command->line("  Skipping {$company->name} — already has {$existing} PM plans.");
                continue;
            }

            // Delete any partial test plans so we start clean
            if ($existing > 0) {
                PmPlan::query()->where('company_id', $company->id)->forceDelete();
                $this->command->line("  Cleared {$existing} test plan(s) from {$company->name}.");
            }

            // Resolve people
            $managerMember = $this->getFirstMemberByRole($company->id, 'manager');
            $technicianIds = $this->getTechnicianIds($company->id);
            $assetIds      = Asset::query()->where('company_id', $company->id)->pluck('id')->all();

            $count = 0;

            foreach ($this->planTemplates as $index => $template) {
                $planCode = 'PM-' . str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);

                // Spread next_run_at across the next 6 months
                $nextRunAt  = Carbon::now()->addDays($template['offset_days']);
                $lastRunAt  = $template['status'] === 'active'
                    ? Carbon::now()->subDays(rand(10, 60))
                    : null;

                $assignedId = ! empty($technicianIds)
                    ? $technicianIds[$index % count($technicianIds)]
                    : null;

                $assetId = ! empty($assetIds)
                    ? $assetIds[$index % count($assetIds)]
                    : null;

                DB::transaction(function () use (
                    $company, $template, $planCode, $managerMember,
                    $assignedId, $assetId, $nextRunAt, $lastRunAt
                ): void {
                    $plan = PmPlan::query()->create([
                        'company_id'           => $company->id,
                        'code'                 => $planCode,
                        'name'                 => $template['name'],
                        'description'          => $template['description'],
                        'status'               => $template['status'],
                        'priority'             => $template['priority'],
                        'estimated_minutes'    => $template['estimated_minutes'],
                        'created_by_member_id' => $managerMember?->id,
                        'assigned_member_id'   => $assignedId,
                    ]);

                    if ($assetId) {
                        $plan->assets()->sync([$assetId]);
                    }

                    PmTrigger::query()->create([
                        'pm_plan_id'     => $plan->id,
                        'trigger_type'   => 'time_based',
                        'interval_value' => $template['interval_value'],
                        'interval_unit'  => $template['interval_unit'],
                        'next_run_at'    => $nextRunAt,
                        'last_run_at'    => $lastRunAt,
                    ]);
                });

                $count++;
            }

            $this->command->info("Seeded {$count} PM plans for: {$company->name}");
        }
    }

    private function getFirstMemberByRole(int $companyId, string $roleCode): ?Member
    {
        return Member::query()
            ->where('company_id', $companyId)
            ->whereHas('roles', fn ($q) => $q->where('code', $roleCode))
            ->first();
    }

    /** @return int[] */
    private function getTechnicianIds(int $companyId): array
    {
        return Member::query()
            ->where('company_id', $companyId)
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->pluck('id')
            ->all();
    }
}
