<?php

namespace Database\Seeders;

use App\Models\StockMove;
use App\Models\WorkOrder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        $companyId  = 1;
        $assetIds   = [19, 12, 13, 17, 18, 15, 16, 14, 10, 11, 21, 2, 7, 8, 9, 4, 5, 6, 20];
        $memberIds  = [63, 64];   // Operations Manager, Field Technician
        $warehouseId = 2;          // Main Warehouse
        $itemIds    = [5, 6, 7, 8, 14, 2, 3, 4, 10, 11, 12, 13, 9, 15, 18];

        $statuses   = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled'];
        $priorities = ['critical', 'high', 'medium', 'low'];

        $titles = [
            'Hydraulic filter replacement',
            'Compressor belt inspection',
            'Oil leak repair on pump unit',
            'Electrical panel maintenance',
            'Bearing replacement – Motor #3',
            'Conveyor belt alignment check',
            'Boiler safety valve test',
            'HVAC filter cleaning',
            'Gearbox oil change',
            'Cooling tower inspection',
            'Air compressor overhaul',
            'Pump seal replacement',
            'Electrical wiring inspection',
            'Emergency generator test run',
            'Forklift hydraulic service',
            'Steam trap replacement',
            'Motor vibration analysis',
            'Valve actuator calibration',
            'Roof AC unit service',
            'Water pump impeller check',
            'Chiller refrigerant check',
            'Pressure gauge calibration',
            'Conveyor chain lubrication',
            'Welding machine maintenance',
            'Lighting system inspection',
            'Fire suppression system test',
            'Crane wire rope inspection',
            'Compressor air dryer service',
            'Fuel filter replacement',
            'Exhaust fan bearing lubrication',
        ];

        $now     = Carbon::now();
        $lastWoId = WorkOrder::max('id') ?? 45;
        $woCounter = (int) substr(WorkOrder::orderByDesc('id')->value('code') ?? 'WO-0045', 3) + 1;

        DB::beginTransaction();

        try {
            // Generate 60 work orders spread across last 6 months
            $woInserts = [];
            for ($i = 0; $i < 60; $i++) {
                // Random date within last 6 months
                $daysBack  = rand(0, 180);
                $openedAt  = $now->copy()->subDays($daysBack)->setTime(rand(7, 17), rand(0, 59), 0);
                $assetId   = $assetIds[array_rand($assetIds)];
                $priority  = $priorities[array_rand($priorities)];
                $creatorId = $memberIds[array_rand($memberIds)];

                // Weighted status: more completed than anything else
                $statusRoll = rand(1, 100);
                if ($statusRoll <= 45)      $status = 'completed';
                elseif ($statusRoll <= 65)  $status = 'open';
                elseif ($statusRoll <= 78)  $status = 'in_progress';
                elseif ($statusRoll <= 88)  $status = 'on_hold';
                else                        $status = 'cancelled';

                $closedAt  = null;
                $dueAt     = $openedAt->copy()->addDays(rand(3, 14));

                if ($status === 'completed') {
                    $hoursToClose = rand(4, 72);
                    $closedAt     = $openedAt->copy()->addHours($hoursToClose);
                }

                $woInserts[] = [
                    'company_id'          => $companyId,
                    'asset_id'            => $assetId,
                    'created_by_member_id'=> $creatorId,
                    'code'                => 'WO-' . str_pad($woCounter++, 4, '0', STR_PAD_LEFT),
                    'title'               => $titles[array_rand($titles)],
                    'description'         => 'Scheduled maintenance task generated for testing purposes.',
                    'status'              => $status,
                    'priority'            => $priority,
                    'opened_at'           => $openedAt,
                    'due_at'              => $dueAt,
                    'closed_at'           => $closedAt,
                    'created_at'          => $openedAt,
                    'updated_at'          => $closedAt ?? $openedAt,
                ];
            }

            // Insert WOs in chunks
            foreach (array_chunk($woInserts, 20) as $chunk) {
                WorkOrder::insert($chunk);
            }

            // Attach technicians to all new WOs
            $newWos = WorkOrder::where('company_id', $companyId)
                ->orderByDesc('id')
                ->take(60)
                ->pluck('id');

            $pivotRows = [];
            foreach ($newWos as $woId) {
                $techId = $memberIds[array_rand($memberIds)];
                $pivotRows[] = [
                    'work_order_id' => $woId,
                    'member_id'     => $techId,
                    'assigned_at'   => now(),
                ];
            }
            foreach (array_chunk($pivotRows, 50) as $chunk) {
                DB::table('work_order_members')->insert($chunk);
            }

            // Generate stock moves for completed WOs (1-3 parts each)
            $completedWos = WorkOrder::where('company_id', $companyId)
                ->where('status', 'completed')
                ->orderByDesc('id')
                ->take(60)
                ->get(['id', 'opened_at', 'closed_at', 'created_by_member_id']);

            $smInserts = [];
            foreach ($completedWos as $wo) {
                $partCount = rand(1, 3);
                $usedItems = (array) array_rand($itemIds, min($partCount, count($itemIds)));

                foreach ($usedItems as $itemKey) {
                    $itemId = $itemIds[$itemKey];
                    $qty    = rand(1, 5);
                    $movedAt  = $wo->closed_at ?? $wo->opened_at;

                    $smInserts[] = [
                        'company_id'          => $companyId,
                        'item_id'             => $itemId,
                        'warehouse_id'        => $warehouseId,
                        'work_order_id'       => $wo->id,
                        'created_by_member_id'=> $wo->created_by_member_id,
                        'move_type'           => 'out',
                        'quantity'            => -$qty,
                        'moved_at'            => $movedAt,
                        'reference'           => 'WO-PARTS',
                        'notes'               => null,
                    ];
                }
            }

            foreach (array_chunk($smInserts, 50) as $chunk) {
                StockMove::insert($chunk);
            }

            DB::commit();

            $this->command->info('✓ Created ' . count($woInserts) . ' work orders');
            $this->command->info('✓ Created ' . count($smInserts) . ' stock moves (parts used)');
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command->error('Seeder failed: ' . $e->getMessage());
        }
    }
}
