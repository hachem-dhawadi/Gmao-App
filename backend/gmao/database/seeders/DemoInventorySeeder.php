<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Item;
use App\Models\Member;
use App\Models\StockMove;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

/**
 * Seeds realistic inventory data: items, warehouses, and stock moves.
 * Run: php artisan db:seed --class=DemoInventorySeeder
 */
class DemoInventorySeeder extends Seeder
{
    private array $itemTemplates = [
        ['code' => 'FILT-001', 'name' => 'Hydraulic Oil Filter',         'unit' => 'pcs',  'unit_cost' => 18.50,  'min_stock' => 5,  'description' => '10-micron hydraulic oil filter element'],
        ['code' => 'FILT-002', 'name' => 'Air Filter Element',           'unit' => 'pcs',  'unit_cost' => 12.00,  'min_stock' => 10, 'description' => 'Intake air filter for compressors'],
        ['code' => 'FILT-003', 'name' => 'Oil Filter Cartridge',         'unit' => 'pcs',  'unit_cost' => 9.75,   'min_stock' => 8,  'description' => 'Spin-on oil filter for diesel engines'],
        ['code' => 'BEAR-001', 'name' => 'Ball Bearing 6205',            'unit' => 'pcs',  'unit_cost' => 7.20,   'min_stock' => 20, 'description' => 'Single row deep groove ball bearing'],
        ['code' => 'BEAR-002', 'name' => 'Roller Bearing 32210',         'unit' => 'pcs',  'unit_cost' => 45.00,  'min_stock' => 6,  'description' => 'Tapered roller bearing for heavy loads'],
        ['code' => 'BELT-001', 'name' => 'V-Belt A42',                   'unit' => 'pcs',  'unit_cost' => 6.50,   'min_stock' => 15, 'description' => 'Classical V-belt for drive systems'],
        ['code' => 'BELT-002', 'name' => 'Timing Belt HTD 1440-8M',      'unit' => 'pcs',  'unit_cost' => 38.00,  'min_stock' => 4,  'description' => 'Synchronous HTD timing belt'],
        ['code' => 'SEAL-001', 'name' => 'Oil Seal 40x62x10',            'unit' => 'pcs',  'unit_cost' => 4.30,   'min_stock' => 20, 'description' => 'Rotary shaft seal, NBR material'],
        ['code' => 'OIL-001',  'name' => 'Hydraulic Oil HM 46 (20L)',    'unit' => 'can',  'unit_cost' => 62.00,  'min_stock' => 3,  'description' => 'ISO VG 46 mineral hydraulic oil'],
        ['code' => 'OIL-002',  'name' => 'Gear Oil SAE 90 (5L)',         'unit' => 'can',  'unit_cost' => 24.50,  'min_stock' => 5,  'description' => 'Mineral gear lubricant'],
        ['code' => 'GREAS-01', 'name' => 'Multipurpose Grease (1kg)',     'unit' => 'kg',   'unit_cost' => 11.00,  'min_stock' => 10, 'description' => 'Lithium-complex grease NLGI 2'],
        ['code' => 'HOSE-001', 'name' => 'Hydraulic Hose DN10 1m',       'unit' => 'm',    'unit_cost' => 8.80,   'min_stock' => 10, 'description' => '1/4" hydraulic hose, 250 bar WP'],
        ['code' => 'BOLT-M12', 'name' => 'Hex Bolt M12x50 (box/50)',     'unit' => 'box',  'unit_cost' => 14.00,  'min_stock' => 5,  'description' => 'M12x50 stainless hex bolt DIN 933'],
        ['code' => 'GASKET-01','name' => 'Flange Gasket DN50',           'unit' => 'pcs',  'unit_cost' => 3.20,   'min_stock' => 30, 'description' => 'Rubber spiral wound flange gasket'],
        ['code' => 'WIRE-001', 'name' => 'Welding Wire E71T-GS (1kg)',   'unit' => 'spool','unit_cost' => 19.00,  'min_stock' => 8,  'description' => 'Flux-cored gasless welding wire 0.9mm'],
        ['code' => 'FUSE-001', 'name' => 'Ceramic Fuse 10A (pack/10)',   'unit' => 'pack', 'unit_cost' => 4.50,   'min_stock' => 20, 'description' => '10A ceramic fuse 5x20mm'],
        ['code' => 'RELAY-01', 'name' => 'Contactor 25A 24VDC',         'unit' => 'pcs',  'unit_cost' => 28.00,  'min_stock' => 4,  'description' => '3-pole power contactor 24V coil'],
        ['code' => 'PAINT-01', 'name' => 'Protective Spray Paint (400ml)','unit' => 'can', 'unit_cost' => 5.50,   'min_stock' => 15, 'description' => 'RAL 5010 anti-rust spray paint'],
        ['code' => 'CLEAN-01', 'name' => 'Parts Cleaner Solvent (5L)',   'unit' => 'can',  'unit_cost' => 16.00,  'min_stock' => 5,  'description' => 'Fast-evaporating degreaser for metal parts'],
        ['code' => 'GLOVE-01', 'name' => 'Nitrile Work Gloves (pair)',   'unit' => 'pair', 'unit_cost' => 1.80,   'min_stock' => 50, 'description' => 'Chemical-resistant nitrile gloves size L'],
    ];

    private array $warehouseTemplates = [
        ['code' => 'WH-01', 'name' => 'Main Warehouse',       'location' => 'Building A – Ground Floor'],
        ['code' => 'WH-02', 'name' => 'Workshop Store',       'location' => 'Workshop Hall – Room 3'],
        ['code' => 'WH-03', 'name' => 'Site B Storage',       'location' => 'Site B – Container 2'],
        ['code' => 'WH-04', 'name' => 'Chemical Cabinet',     'location' => 'Building A – Floor 1, Room 112'],
        ['code' => 'WH-05', 'name' => 'Electrical Spare Room','location' => 'MCC Room – Panel Store'],
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
            // --- Warehouses ---
            $warehouses = collect();
            foreach ($this->warehouseTemplates as $tpl) {
                $wh = Warehouse::query()->firstOrCreate(
                    ['company_id' => $company->id, 'code' => $tpl['code']],
                    ['name' => $tpl['name'], 'location' => $tpl['location']],
                );
                $warehouses->push($wh);
            }

            // --- Items ---
            $items = collect();
            foreach ($this->itemTemplates as $tpl) {
                $item = Item::query()->firstOrCreate(
                    ['company_id' => $company->id, 'code' => $tpl['code']],
                    [
                        'name'        => $tpl['name'],
                        'description' => $tpl['description'],
                        'unit'        => $tpl['unit'],
                        'unit_cost'   => $tpl['unit_cost'],
                        'min_stock'   => $tpl['min_stock'],
                        'is_stocked'  => true,
                    ],
                );
                $items->push($item);
            }

            // Pick a member to attribute moves to
            $member = Member::query()
                ->where('company_id', $company->id)
                ->where('status', 'active')
                ->inRandomOrder()
                ->first();

            // --- Stock Moves ---
            // For each item, record an initial receipt into WH-01 and WH-02,
            // then simulate a few consumptions and an adjustment.
            $mainWh     = $warehouses->firstWhere('code', 'WH-01');
            $workshopWh = $warehouses->firstWhere('code', 'WH-02');

            foreach ($items as $item) {
                $initialQty = rand(10, 80);

                // Initial receipt — main warehouse
                $this->move($company->id, $item->id, $mainWh->id, $member?->id, 'in', $initialQty,
                    now()->subDays(rand(60, 90)), 'PO-' . strtoupper(substr(md5(rand()), 0, 6)), 'Opening stock');

                // Split some to workshop
                $splitQty = rand(2, (int) ($initialQty * 0.4));
                $this->move($company->id, $item->id, $workshopWh->id, $member?->id, 'in', $splitQty,
                    now()->subDays(rand(30, 59)), 'INT-TRANSFER', 'Internal transfer from WH-01');
                $this->move($company->id, $item->id, $mainWh->id, $member?->id, 'out', $splitQty,
                    now()->subDays(rand(30, 59)), 'INT-TRANSFER', 'Internal transfer to WH-02');

                // A few consumptions from main warehouse
                $consumed = rand(1, max(1, (int) ($initialQty * 0.3)));
                $this->move($company->id, $item->id, $mainWh->id, $member?->id, 'out', $consumed,
                    now()->subDays(rand(5, 29)), 'WO-' . rand(1000, 9999), 'Used on maintenance work order');

                // Occasional adjustment (small positive or negative)
                if (rand(0, 2) === 0) {
                    $adj = rand(-2, 3);
                    if ($adj !== 0) {
                        $this->move($company->id, $item->id, $mainWh->id, $member?->id, 'adjustment', $adj,
                            now()->subDays(rand(1, 10)), 'STOCK-COUNT', 'Physical count correction');
                    }
                }
            }

            $this->command->info("Seeded inventory for: {$company->name} — {$items->count()} items, {$warehouses->count()} warehouses");
        }
    }

    private function move(
        int $companyId,
        int $itemId,
        int $warehouseId,
        ?int $memberId,
        string $type,
        float $qty,
        \DateTimeInterface $movedAt,
        ?string $reference,
        ?string $notes,
    ): void {
        // out moves are stored negative
        if ($type === 'out' && $qty > 0) {
            $qty = -$qty;
        }

        StockMove::query()->create([
            'company_id'           => $companyId,
            'item_id'              => $itemId,
            'warehouse_id'         => $warehouseId,
            'created_by_member_id' => $memberId,
            'move_type'            => $type,
            'quantity'             => $qty,
            'moved_at'             => $movedAt,
            'reference'            => $reference,
            'notes'                => $notes,
        ]);
    }
}
