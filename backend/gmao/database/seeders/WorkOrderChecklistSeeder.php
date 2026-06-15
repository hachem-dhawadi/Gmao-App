<?php

namespace Database\Seeders;

use App\Models\WorkOrder;
use App\Models\WorkOrderChecklistItem;
use Illuminate\Database\Seeder;

class WorkOrderChecklistSeeder extends Seeder
{
    // Generic task sets mapped to keywords found in WO titles
    private array $taskSets = [
        'pump' => [
            'Inspect pump seals and gaskets for leaks',
            'Check oil level and lubrication',
            'Measure vibration levels',
            'Test pressure and flow rate',
            'Inspect impeller and casing',
            'Verify motor alignment',
        ],
        'generator' => [
            'Check fuel level and fuel lines',
            'Inspect battery and connections',
            'Test automatic transfer switch',
            'Check coolant level',
            'Inspect air filter',
            'Run load test for 15 minutes',
            'Check oil pressure and temperature',
        ],
        'hvac' => [
            'Replace air filters',
            'Clean evaporator and condenser coils',
            'Check refrigerant levels',
            'Inspect electrical connections',
            'Lubricate fan motors and bearings',
            'Test thermostat calibration',
            'Check drain pans and condensate lines',
        ],
        'compressor' => [
            'Check oil level and quality',
            'Inspect belts and pulleys for wear',
            'Test safety relief valve',
            'Drain moisture from air tank',
            'Check intake filter',
            'Verify operating pressure',
            'Inspect hoses and fittings for leaks',
        ],
        'conveyor' => [
            'Inspect belt for wear and misalignment',
            'Lubricate bearings and rollers',
            'Check belt tension',
            'Inspect drive motor and gearbox',
            'Clean debris from belt and rollers',
            'Test emergency stop function',
        ],
        'forklift' => [
            'Check tire pressure and condition',
            'Inspect forks for cracks or bends',
            'Test horn and lights',
            'Check hydraulic fluid level',
            'Inspect chains and mast',
            'Test brakes and steering',
            'Check battery charge level',
        ],
        'electrical' => [
            'Inspect panel for signs of overheating',
            'Test circuit breakers',
            'Check all wire connections and terminals',
            'Measure voltage and current draw',
            'Inspect grounding connections',
            'Test emergency shutdown',
        ],
        'inspection' => [
            'Visual inspection of all components',
            'Check for unusual noise or vibration',
            'Inspect safety guards and covers',
            'Review maintenance history',
            'Document findings and measurements',
            'Test all safety features',
        ],
        'preventive' => [
            'Clean equipment surfaces',
            'Lubricate all moving parts',
            'Inspect for wear and corrosion',
            'Tighten all fasteners and connections',
            'Check fluid levels',
            'Test operation under load',
            'Document completion and observations',
        ],
        'repair' => [
            'Identify root cause of failure',
            'Gather required tools and spare parts',
            'Isolate and lock out equipment',
            'Perform repair or replacement',
            'Test repaired component',
            'Run equipment under normal conditions',
            'Document repair details and parts used',
        ],
        'motor' => [
            'Measure insulation resistance',
            'Check bearing temperature',
            'Inspect motor windings',
            'Lubricate bearings',
            'Check coupling and alignment',
            'Measure current draw on all phases',
        ],
        'valve' => [
            'Check valve for leaks',
            'Test open/close operation',
            'Inspect actuator and positioner',
            'Lubricate stem and packing',
            'Verify correct calibration',
        ],
    ];

    private array $defaultTasks = [
        'Inspect equipment for visible damage or leaks',
        'Check all connections and fastenings',
        'Test operation and verify normal function',
        'Clean equipment and work area',
        'Document findings and actions taken',
    ];

    public function run(): void
    {
        // Only seed WOs that have no checklist items
        $workOrders = WorkOrder::query()
            ->whereDoesntHave('checklistItems')
            ->get();

        $this->command->info("Seeding checklist items for {$workOrders->count()} work orders...");

        foreach ($workOrders as $wo) {
            $tasks = $this->getTasksForWo($wo);

            foreach ($tasks as $index => $title) {
                WorkOrderChecklistItem::create([
                    'work_order_id' => $wo->id,
                    'title'         => $title,
                    'is_completed'  => false,
                    'order_index'   => $index,
                ]);
            }
        }

        $this->command->info('Done.');
    }

    private function getTasksForWo(WorkOrder $wo): array
    {
        $haystack = strtolower($wo->title . ' ' . ($wo->description ?? ''));

        foreach ($this->taskSets as $keyword => $tasks) {
            if (str_contains($haystack, $keyword)) {
                return $tasks;
            }
        }

        return $this->defaultTasks;
    }
}
