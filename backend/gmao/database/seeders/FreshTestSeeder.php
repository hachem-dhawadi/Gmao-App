<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetChecklistTemplate;
use App\Models\CalendarEvent;
use App\Models\Company;
use App\Models\Item;
use App\Models\Member;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\Receipt;
use App\Models\ReceiptLine;
use App\Models\Supplier;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Single command to wipe and reseed the full CMMS demo dataset.
 *
 * php artisan migrate:fresh --seeder=FreshTestSeeder
 *
 * ┌─────────────────────────────────┬───────────────┬───────────┬────────┐
 * │ Email                           │ Password      │ Role      │ Site   │
 * ├─────────────────────────────────┼───────────────┼───────────┼────────┤
 * │ superadmin@gmao.test            │ SuperAdmin123!│ Superadmin│  —     │
 * │ admin@gmao.test                 │ Admin123!     │ Admin     │ HQ     │
 * │ manager@gmao.test               │ Manager123!   │ Manager   │ Site A │
 * │ manager2@gmao.test              │ Manager123!   │ Manager   │ Site B │
 * │ technician@gmao.test            │ Tech123456!   │ Technician│ Site A │
 * │ technician2@gmao.test           │ Tech123456!   │ Technician│ Site B │
 * │ hr@gmao.test                    │ Hr123456!     │ HR        │ HQ     │
 * └─────────────────────────────────┴───────────────┴───────────┴────────┘
 */
class FreshTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Core users (superadmin + 5 Demo Company members)
        $this->call(InitialAccessSeeder::class);

        // 2. Extra members (manager2 + technician2)
        $this->addExtraMembers();

        // 3. Asset types
        $this->call(AssetTypeSeeder::class);

        // 4. Assets (~20 industrial assets)
        $this->call(DemoAssetSeeder::class);

        // 6. Inventory: items, warehouses, stock
        $this->call(DemoInventorySeeder::class);

        // 7. Extra realistic members (Ahmed, Karim, etc.)
        $this->call(DemoWorkOrderMembersSeeder::class);

        // 8. Sites + assign to assets / warehouses / ALL members + member_sites pivot
        $this->call(DemoSiteSeeder::class);

        // 9. Teams
        $this->seedTeams();

        // 10. Asset checklist templates (default tasks for 4 assets)
        $this->seedChecklistTemplates();

        // 11. PM plans with tasks and triggers
        $this->call(DemoPmPlanSeeder::class);

        // 12. Work orders (mixed statuses, spread over 6 months)
        $this->call(DemoWorkOrderSeeder::class);

        // 13. Maintenance requests
        $this->call(DemoMaintenanceRequestSeeder::class);

        // 14. File manager folders + documents
        $this->call(DemoFileManagerSeeder::class);

        // 15. Suppliers + purchase orders (with lines)
        $this->seedPurchasing();

        // 16. Receipts for received POs
        $this->seedReceipts();

        // 18. Calendar events
        $this->seedCalendarEvents();

        // 19. 3 pending_approval WOs for approval workflow testing
        $this->seedPendingApprovalWorkOrders();

        $this->printSummary();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Extra members
    // ─────────────────────────────────────────────────────────────────────
    private function addExtraMembers(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();
        $roles   = app(CompanyRbacSetupService::class)->bootstrapForCompany($company);

        $extras = [
            [
                'email'    => 'manager2@gmao.test',
                'name'     => 'Maintenance Manager',
                'password' => 'Manager123!',
                'phone'    => '+21655555555',
                'code'     => 'MGR-002',
                'title'    => 'Maintenance Manager',
                'role'     => 'manager',
            ],
            [
                'email'    => 'technician2@gmao.test',
                'name'     => 'Technician Site B',
                'password' => 'Tech123456!',
                'phone'    => '+21666666666',
                'code'     => 'TECH-002',
                'title'    => 'Technician',
                'role'     => 'technician',
            ],
        ];

        foreach ($extras as $e) {
            $user = User::query()->updateOrCreate(
                ['email' => $e['email']],
                [
                    'name'               => $e['name'],
                    'password'           => Hash::make($e['password']),
                    'phone'              => $e['phone'],
                    'locale'             => 'en',
                    'two_factor_enabled' => false,
                    'is_active'          => true,
                    'is_superadmin'      => false,
                    'email_verified_at'  => now(),
                ]
            );

            $member = Member::query()->firstOrCreate(
                ['company_id' => $company->id, 'user_id' => $user->id],
                ['employee_code' => $e['code'], 'job_title' => $e['title'], 'status' => 'active']
            );

            $member->roles()->syncWithoutDetaching([$roles[$e['role']]->id]);
        }

        $this->command->info('✓ Extra members added (manager2, technician2)');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 9. Teams
    // ─────────────────────────────────────────────────────────────────────
    private function seedTeams(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();

        $techMembers = Member::query()
            ->where('company_id', $company->id)
            ->whereHas('roles', fn ($q) => $q->where('code', 'technician'))
            ->get();

        if ($techMembers->count() < 2) return;

        $teamA = Team::query()->firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Mechanical Team'],
            ['description' => 'Handles all mechanical maintenance tasks', 'color' => '#3b82f6', 'is_active' => true]
        );
        $teamA->members()->syncWithoutDetaching($techMembers->take(3)->pluck('id')->toArray());

        $teamB = Team::query()->firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Electrical Team'],
            ['description' => 'Handles electrical and instrumentation work', 'color' => '#f59e0b', 'is_active' => true]
        );
        $teamB->members()->syncWithoutDetaching($techMembers->skip(3)->take(3)->pluck('id')->toArray());

        $this->command->info('✓ 2 teams seeded (Mechanical, Electrical)');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 10. Asset checklist templates
    // ─────────────────────────────────────────────────────────────────────
    private function seedChecklistTemplates(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();

        $templates = [
            // ── Pumps ──────────────────────────────────────────────────────
            'PMP-001' => [
                'Check inlet/outlet pressure gauges',
                'Inspect mechanical seal for leaks',
                'Verify bearing temperature (< 70°C)',
                'Check motor current draw',
                'Lubricate bearings if required',
                'Record vibration readings',
            ],
            'PMP-002' => [
                'Check hydraulic fluid level in reservoir',
                'Inspect high-pressure hoses for cracks or swelling',
                'Verify relief valve pressure setting',
                'Check pump flow rate at rated speed',
                'Inspect filter element — replace if differential pressure high',
                'Check for abnormal noise or heat at pump body',
            ],
            'PMP-003' => [
                'Inspect submersible cable for damage',
                'Check pump discharge pressure and flow',
                'Clean inlet strainer screen',
                'Verify float switch operation',
                'Check sump pit level sensors',
                'Record hours run since last service',
            ],
            // ── Motors ─────────────────────────────────────────────────────
            'MOT-001' => [
                'Check belt tension and alignment',
                'Inspect motor ventilation grille',
                'Measure winding insulation resistance',
                'Grease bearings (2 pumps each side)',
                'Check coupling for wear',
            ],
            'MOT-002' => [
                'Inspect fan blade for cracks or imbalance',
                'Check motor terminal box for moisture ingress',
                'Measure motor temperature at full load',
                'Verify rotation direction',
                'Lubricate motor bearings',
                'Check cooling tower fan belt tension',
            ],
            'MOT-003' => [
                'Inspect mixer shaft seal for leaks',
                'Check agitator blade for wear or buildup',
                'Verify gearbox oil level',
                'Check motor current under load',
                'Inspect coupling and anchor bolts',
            ],
            // ── Compressors ────────────────────────────────────────────────
            'COMP-001' => [
                'Check oil level in sight glass',
                'Drain condensate from receiver tank',
                'Inspect air intake filter — replace if dirty',
                'Check belt tension',
                'Verify unloader valve operation',
                'Record outlet pressure and temperature',
            ],
            'COMP-002' => [
                'Check crankcase oil level',
                'Inspect piston rod packing for leaks',
                'Drain condensate from air receiver',
                'Check safety relief valve — lift manually to test',
                'Inspect valve plates and seats',
                'Record suction and discharge pressures',
            ],
            // ── Conveyors ──────────────────────────────────────────────────
            'CONV-001' => [
                'Inspect belt for tears, fraying, or tracking issues',
                'Check belt tension — adjust take-up if needed',
                'Lubricate tail pulley and head pulley bearings',
                'Inspect idler rollers for seized or noisy rollers',
                'Check belt scraper/cleaner contact',
                'Verify emergency stop cord operation',
            ],
            'CONV-002' => [
                'Inspect roller surfaces for flat spots or wear',
                'Check roller frame alignment',
                'Lubricate drive chain and sprockets',
                'Verify guide rail clearance',
                'Test photo-eye sensors at entry/exit',
            ],
            // ── HVAC ───────────────────────────────────────────────────────
            'HVAC-001' => [
                'Replace air filter media',
                'Clean evaporator coil fins',
                'Check refrigerant pressure (high + low side)',
                'Inspect fan belt for cracking or wear',
                'Clean drain pan and condensate line',
                'Verify thermostat calibration ±1°C',
            ],
            'HVAC-002' => [
                'Clean or replace indoor unit air filter',
                'Clean indoor coil fins with soft brush',
                'Check outdoor unit for debris or blockage',
                'Verify condensate drain is clear',
                'Check refrigerant sight glass — confirm no bubbles',
                'Test cooling performance — measure supply air temperature',
            ],
            // ── Electrical panels ──────────────────────────────────────────
            'ELEC-001' => [
                'Inspect all breakers and fuses for signs of overheating',
                'Check torque on main bus bar connections',
                'Measure voltage on all three phases (L1, L2, L3)',
                'Test ground fault relay — verify trip response',
                'Clean inside cabinet with dry compressed air',
                'Log any abnormal readings in maintenance register',
            ],
            'ELEC-002' => [
                'Check all circuit breaker status (none tripped)',
                'Inspect cable entry glands for damage',
                'Measure panel voltage and compare to setpoint',
                'Check earth bonding connection',
                'Verify panel door seal and lock',
            ],
            // ── Boiler ─────────────────────────────────────────────────────
            'BOIL-001' => [
                'Check boiler water level in sight glass',
                'Test low-water cutoff by drain test',
                'Inspect burner flame — verify stable blue flame',
                'Check steam pressure gauge reading vs setpoint',
                'Inspect flue gas outlet for abnormal smoke',
                'Blow down bottom blowdown valve (30 seconds)',
                'Check safety relief valve for weeping',
                'Record fuel consumption and operating hours',
            ],
            // ── Generator ──────────────────────────────────────────────────
            'GEN-001' => [
                'Check engine oil level — top up if below MIN',
                'Check coolant level in radiator overflow tank',
                'Inspect air cleaner element — replace if blocked',
                'Check fuel level and fuel filter condition',
                'Inspect battery terminals — clean and tighten',
                'Run load test for 30 minutes — record voltage and frequency',
                'Check exhaust system for leaks or cracks',
                'Verify automatic transfer switch (ATS) operation',
            ],
            // ── IT/SCADA ───────────────────────────────────────────────────
            'IT-001' => [
                'Check SCADA server CPU and memory usage',
                'Verify all PLC communication tags are active',
                'Inspect UPS battery health — replace if < 80% capacity',
                'Clean server cabinet air filters',
                'Verify backup process completed successfully',
                'Check server room temperature (target: 20–24°C)',
            ],
            // ── Other ──────────────────────────────────────────────────────
            'OTH-001' => [
                'Calibrate scale with certified test weights',
                'Clean weighing platform and load cells',
                'Check indicator display for correct zero reading',
                'Inspect overload protection stops',
                'Record calibration certificate reference',
            ],
            'OTH-002' => [
                'Inspect wire rope for broken wires or kinking',
                'Lubricate wire rope and sheaves',
                'Test upper and lower limit switches',
                'Check hook latch for positive lock',
                'Inspect brake operation — load test at 50% SWL',
                'Inspect runway rails for alignment and wear',
                'Verify operator warning bell and lights',
            ],
            // ── Vehicle ────────────────────────────────────────────────────
            'VEH-001' => [
                'Check engine oil level',
                'Check hydraulic oil level',
                'Inspect forks for cracks or bends',
                'Test horn, lights, and backup alarm',
                'Check tyre pressure and tread condition',
                'Inspect mast chains — lubricate with chain oil',
                'Test lift and tilt functions at full capacity',
                'Record battery charge level (electric) or fuel level',
            ],
        ];

        foreach ($templates as $code => $tasks) {
            $asset = Asset::query()
                ->where('company_id', $company->id)
                ->where('code', $code)
                ->first();

            if (! $asset) continue;

            AssetChecklistTemplate::where('asset_id', $asset->id)->delete();

            foreach ($tasks as $idx => $title) {
                AssetChecklistTemplate::create([
                    'asset_id'    => $asset->id,
                    'title'       => $title,
                    'order_index' => $idx,
                ]);
            }

            $this->command->info("  ✓ {$code} — " . count($tasks) . ' default tasks');
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 15. Suppliers + Purchase Orders
    // ─────────────────────────────────────────────────────────────────────
    private function seedPurchasing(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();

        $adminMember = Member::query()
            ->where('company_id', $company->id)
            ->whereHas('user', fn ($q) => $q->where('email', 'admin@gmao.test'))
            ->firstOrFail();

        $supplierData = [
            ['name' => 'TechSupply Pro',      'email' => 'orders@techsupply.test',    'phone' => '+21671000001', 'contact_name' => 'Rami Gharbi',   'address' => '12 Industrial Zone, Tunis'],
            ['name' => 'MechaPartsPlus',      'email' => 'sales@mechaparts.test',     'phone' => '+21671000002', 'contact_name' => 'Sana Mrad',     'address' => '45 Avenue de la République, Sfax'],
            ['name' => 'ElectroCom Tunisia',  'email' => 'contact@electrocom.test',   'phone' => '+21671000003', 'contact_name' => 'Hatem Bchir',   'address' => '8 Rue de la Liberté, Sousse'],
            ['name' => 'SafetyFirst Supplies','email' => 'info@safetyfirst.test',     'phone' => '+21671000004', 'contact_name' => 'Leila Zouari',  'address' => '22 Zone Franche, Bizerte'],
            ['name' => 'OilTech SARL',        'email' => 'supply@oiltech.test',       'phone' => '+21671000005', 'contact_name' => 'Adel Ferchichi','address' => '5 Rue Habib Bourguiba, Gabes'],
        ];

        $suppliers = [];
        foreach ($supplierData as $sd) {
            $suppliers[] = Supplier::query()->firstOrCreate(
                ['company_id' => $company->id, 'name' => $sd['name']],
                array_merge($sd, ['company_id' => $company->id])
            );
        }

        // Pre-load item IDs by code for line items
        $itemIds = Item::query()
            ->where('company_id', $company->id)
            ->pluck('id', 'code')
            ->toArray();

        $poTemplates = [
            [
                'supplier_idx' => 0, 'status' => 'ordered', 'days_ago' => 15, 'ref' => 'TSP-2026-001',
                'lines' => [
                    ['code' => 'BEAR-001', 'qty' => 4,  'price' => 85.00],
                    ['code' => 'BELT-001', 'qty' => 6,  'price' => 120.00],
                    ['code' => 'FILT-001', 'qty' => 10, 'price' => 22.00],
                ],
            ],
            [
                'supplier_idx' => 1, 'status' => 'received', 'days_ago' => 30, 'ref' => 'MPP-2026-044',
                'lines' => [
                    ['code' => 'SEAL-001', 'qty' => 8,  'price' => 45.00],
                    ['code' => 'GREAS-01', 'qty' => 20, 'price' => 18.50],
                    ['code' => 'BELT-002', 'qty' => 5,  'price' => 155.00],
                    ['code' => 'HOSE-001', 'qty' => 12, 'price' => 89.00],
                ],
            ],
            [
                'supplier_idx' => 2, 'status' => 'draft', 'days_ago' => 3, 'ref' => null,
                'lines' => [
                    ['code' => 'FUSE-001', 'qty' => 25, 'price' => 3.50],
                    ['code' => 'RELAY-01', 'qty' => 10, 'price' => 28.00],
                    ['code' => 'WIRE-001', 'qty' => 50, 'price' => 6.60],
                ],
            ],
            [
                'supplier_idx' => 3, 'status' => 'ordered', 'days_ago' => 8, 'ref' => 'SFS-2026-012',
                'lines' => [
                    ['code' => 'GLOVE-01', 'qty' => 40, 'price' => 4.20],
                    ['code' => 'CLEAN-01', 'qty' => 15, 'price' => 9.50],
                    ['code' => 'BOLT-M12', 'qty' => 100, 'price' => 0.75],
                ],
            ],
            [
                'supplier_idx' => 4, 'status' => 'received', 'days_ago' => 45, 'ref' => 'OT-2026-009',
                'lines' => [
                    ['code' => 'OIL-001',  'qty' => 20, 'price' => 35.00],
                    ['code' => 'OIL-002',  'qty' => 10, 'price' => 55.00],
                    ['code' => 'FILT-002', 'qty' => 15, 'price' => 18.00],
                    ['code' => 'FILT-003', 'qty' => 8,  'price' => 42.00],
                ],
            ],
            [
                'supplier_idx' => 0, 'status' => 'cancelled', 'days_ago' => 60, 'ref' => 'TSP-2025-089',
                'lines' => [
                    ['code' => 'BEAR-002', 'qty' => 3, 'price' => 110.00],
                    ['code' => 'GASKET-01', 'qty' => 20, 'price' => 7.50],
                ],
            ],
        ];

        $counter = 1;
        foreach ($poTemplates as $tpl) {
            $supplier  = $suppliers[$tpl['supplier_idx']];
            $orderedAt = $tpl['status'] !== 'draft'
                ? now()->subDays($tpl['days_ago'])
                : null;

            $lineTotal = array_sum(array_map(
                fn ($l) => $l['qty'] * $l['price'],
                $tpl['lines']
            ));

            $po = PurchaseOrder::query()->create([
                'company_id'              => $company->id,
                'supplier_id'             => $supplier->id,
                'created_by_member_id'    => $adminMember->id,
                'code'                    => 'PO-' . str_pad($counter++, 4, '0', STR_PAD_LEFT),
                'status'                  => $tpl['status'],
                'ordered_at'              => $orderedAt,
                'supplier_reference'      => $tpl['ref'],
                'expected_delivery_at'    => $orderedAt?->copy()->addDays(14),
                'total_amount'            => round($lineTotal, 2),
                'supplier_note'           => null,
                'approved_by_member_id'   => null,
            ]);

            foreach ($tpl['lines'] as $line) {
                $itemId = $itemIds[$line['code']] ?? null;
                if (! $itemId) continue;

                PurchaseOrderLine::query()->create([
                    'purchase_order_id' => $po->id,
                    'item_id'           => $itemId,
                    'qty_ordered'       => $line['qty'],
                    'unit_price'        => $line['price'],
                ]);
            }
        }

        $this->command->info('✓ 5 suppliers + 6 purchase orders + lines seeded');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 16. Receipts for received purchase orders
    // ─────────────────────────────────────────────────────────────────────
    private function seedReceipts(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();

        $receivedPos = PurchaseOrder::query()
            ->where('company_id', $company->id)
            ->where('status', 'received')
            ->with('lines')
            ->get();

        if ($receivedPos->isEmpty()) {
            $this->command->warn('No received POs found — skipping receipts.');
            return;
        }

        $receiptCount = 0;

        foreach ($receivedPos as $po) {
            if ($po->lines->isEmpty()) continue;

            // Main delivery: received 5 days after order date
            $receivedAt = ($po->ordered_at ?? now()->subDays(20))->copy()->addDays(5);

            $receipt = Receipt::query()->create([
                'purchase_order_id' => $po->id,
                'received_at'       => $receivedAt,
            ]);

            foreach ($po->lines as $line) {
                ReceiptLine::query()->create([
                    'receipt_id'           => $receipt->id,
                    'purchase_order_line_id' => $line->id,
                    'qty_received'         => $line->qty_ordered,
                ]);
            }

            $this->command->info("  ✓ Receipt for {$po->code} — {$po->lines->count()} lines fully received");
            $receiptCount++;
        }

        $this->command->info("✓ {$receiptCount} receipts seeded");
    }

    // ─────────────────────────────────────────────────────────────────────
    // 18. Calendar events
    // ─────────────────────────────────────────────────────────────────────
    private function seedCalendarEvents(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();

        $members = Member::query()
            ->where('company_id', $company->id)
            ->whereHas('user', fn ($q) => $q->whereIn('email', [
                'admin@gmao.test',
                'manager@gmao.test',
                'technician@gmao.test',
            ]))
            ->get()
            ->keyBy(fn ($m) => $m->user->email);

        $admin = $members['admin@gmao.test'] ?? null;
        $manager = $members['manager@gmao.test'] ?? null;
        $tech = $members['technician@gmao.test'] ?? null;

        if (! $admin) return;

        $events = [
            ['member' => $admin,   'title' => 'Monthly Safety Audit',                    'color' => 'red',    'offset' => 5,   'duration' => 3],
            ['member' => $manager, 'title' => 'PM Schedule Review — Q3',                 'color' => 'blue',   'offset' => 2,   'duration' => 2],
            ['member' => $tech,    'title' => 'Boiler inspection — SITE-A',               'color' => 'orange', 'offset' => 1,   'duration' => 4],
            ['member' => $admin,   'title' => 'Vendor meeting — TechSupply Pro',          'color' => 'green',  'offset' => -3,  'duration' => 2],
            ['member' => $manager, 'title' => 'Team briefing — Mechanical crew',          'color' => 'purple', 'offset' => 7,   'duration' => 1],
            ['member' => $tech,    'title' => 'Conveyor belt replacement — Line 1',       'color' => 'yellow', 'offset' => 10,  'duration' => 5],
            ['member' => $admin,   'title' => 'Annual equipment compliance review',       'color' => 'blue',   'offset' => -7,  'duration' => 8],
            ['member' => $manager, 'title' => 'New technician onboarding session',        'color' => 'green',  'offset' => 14,  'duration' => 3],
        ];

        foreach ($events as $e) {
            if (! $e['member']) continue;

            $start = now()->addDays($e['offset'])->setTime(9, 0);
            CalendarEvent::query()->create([
                'company_id' => $company->id,
                'member_id'  => $e['member']->id,
                'title'      => $e['title'],
                'color'      => $e['color'],
                'start_at'   => $start,
                'end_at'     => $start->copy()->addHours($e['duration']),
            ]);
        }

        $this->command->info('✓ 8 calendar events seeded');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 17. Pending-approval work orders (approval workflow test)
    // ─────────────────────────────────────────────────────────────────────
    private function seedPendingApprovalWorkOrders(): void
    {
        $company = Company::query()->where('name', 'Demo Company')->firstOrFail();

        $tech1 = Member::query()
            ->where('company_id', $company->id)
            ->whereHas('user', fn ($q) => $q->where('email', 'technician@gmao.test'))
            ->first();

        $tech2 = Member::query()
            ->where('company_id', $company->id)
            ->whereHas('user', fn ($q) => $q->where('email', 'technician2@gmao.test'))
            ->first();

        $asset = Asset::query()
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $tech1 || ! $asset) return;

        $pending = [
            ['creator' => $tech1, 'title' => 'Hydraulic pump seal leaking — urgent fix needed',     'priority' => 'high'],
            ['creator' => $tech1, 'title' => 'Conveyor belt misalignment on Production Line 1',     'priority' => 'medium'],
            ['creator' => $tech2 ?? $tech1, 'title' => 'HVAC unit not cooling — Site B production floor', 'priority' => 'critical'],
        ];

        $counter = WorkOrder::query()
            ->where('company_id', $company->id)
            ->withTrashed()
            ->count() + 1;

        foreach ($pending as $wo) {
            WorkOrder::create([
                'company_id'           => $company->id,
                'asset_id'             => $asset->id,
                'site_id'              => $asset->site_id,
                'created_by_member_id' => $wo['creator']->id,
                'code'                 => 'WO-' . str_pad($counter++, 4, '0', STR_PAD_LEFT),
                'title'                => $wo['title'],
                'description'          => 'Submitted by technician — awaiting manager approval.',
                'status'               => 'pending_approval',
                'priority'             => $wo['priority'],
                'opened_at'            => now()->subHours(rand(1, 48)),
            ]);
        }

        $this->command->info('✓ 3 pending_approval work orders seeded');
    }

    // ─────────────────────────────────────────────────────────────────────
    private function printSummary(): void
    {
        $this->command->newLine();
        $this->command->info('╔══════════════════════════════════════════════════════════════╗');
        $this->command->info('║             FreshTestSeeder — complete ✓                     ║');
        $this->command->info('╠══════════════════════════════════════════════════════════════╣');
        $this->command->info('║  superadmin@gmao.test      SuperAdmin123!   Superadmin       ║');
        $this->command->info('║  admin@gmao.test           Admin123!        Admin  (HQ)      ║');
        $this->command->info('║  manager@gmao.test         Manager123!      Manager (Site A) ║');
        $this->command->info('║  manager2@gmao.test        Manager123!      Manager (Site B) ║');
        $this->command->info('║  technician@gmao.test      Tech123456!      Tech.  (Site A)  ║');
        $this->command->info('║  technician2@gmao.test     Tech123456!      Tech.  (Site B)  ║');
        $this->command->info('║  hr@gmao.test              Hr123456!        HR     (HQ)      ║');
        $this->command->info('╚══════════════════════════════════════════════════════════════╝');
    }
}
