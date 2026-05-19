<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\Company;
use Illuminate\Database\Seeder;

/**
 * Seeds realistic industrial assets per company.
 * Run: php artisan db:seed --class=DemoAssetSeeder
 */
class DemoAssetSeeder extends Seeder
{
    private array $templates = [
        // Pumps
        [
            'code' => 'PMP-001', 'type' => 'PUMP', 'name' => 'Centrifugal Water Pump #1',
            'manufacturer' => 'Grundfos', 'model' => 'CM5-6 A-R-I-E-AVBE',
            'serial_number' => 'GF-2021-001', 'location' => 'Building A – Pump Room',
            'address_label' => 'Floor B1, Zone P1',
            'notes' => 'Primary cooling circuit pump. Check mechanical seal every 6 months.',
            'status' => 'active', 'purchase_offset' => -730, 'warranty_offset' => 365,
        ],
        [
            'code' => 'PMP-002', 'type' => 'PUMP', 'name' => 'Hydraulic Feed Pump',
            'manufacturer' => 'Parker', 'model' => 'PGP505A0160CA1H2NE4E3B1B1',
            'serial_number' => 'PK-2020-044', 'location' => 'Workshop Hall – Bay 2',
            'address_label' => null,
            'notes' => 'Feeds hydraulic press. Replace filter every 500 operating hours.',
            'status' => 'active', 'purchase_offset' => -900, 'warranty_offset' => -165,
        ],
        [
            'code' => 'PMP-003', 'type' => 'PUMP', 'name' => 'Wastewater Submersible Pump',
            'manufacturer' => 'Flygt', 'model' => 'N 3068 MT',
            'serial_number' => 'FL-2019-312', 'location' => 'Site B – Pit Station',
            'address_label' => 'Underground Level -1',
            'notes' => 'Inspect cable and float switch quarterly.',
            'status' => 'under_maintenance', 'purchase_offset' => -1460, 'warranty_offset' => -730,
        ],

        // Motors
        [
            'code' => 'MOT-001', 'type' => 'MOTOR', 'name' => 'Conveyor Drive Motor #1',
            'manufacturer' => 'Siemens', 'model' => '1LE1002-1CB42-2AA4',
            'serial_number' => 'SM-2022-018', 'location' => 'Production Line 1',
            'address_label' => 'Zone C, Drive End',
            'notes' => 'Grease bearings every 2000 h. Check belt tension monthly.',
            'status' => 'active', 'purchase_offset' => -540, 'warranty_offset' => 185,
        ],
        [
            'code' => 'MOT-002', 'type' => 'MOTOR', 'name' => 'Fan Motor – Cooling Tower',
            'manufacturer' => 'ABB', 'model' => 'M2BAX 180MLA4',
            'serial_number' => 'ABB-2021-207', 'location' => 'Rooftop – Cooling Tower',
            'address_label' => null,
            'notes' => 'Outdoor installation. Check insulation resistance annually.',
            'status' => 'active', 'purchase_offset' => -720, 'warranty_offset' => -85,
        ],
        [
            'code' => 'MOT-003', 'type' => 'MOTOR', 'name' => 'Mixer Motor – Tank T-02',
            'manufacturer' => 'WEG', 'model' => 'W22 IE3 15kW 4P',
            'serial_number' => 'WG-2018-099', 'location' => 'Chemical Plant – Tank Farm',
            'address_label' => 'Tank T-02',
            'notes' => null,
            'status' => 'inactive', 'purchase_offset' => -2000, 'warranty_offset' => -1270,
        ],

        // HVAC
        [
            'code' => 'HVAC-001', 'type' => 'HVAC', 'name' => 'Rooftop Air Handling Unit #1',
            'manufacturer' => 'Daikin', 'model' => 'RZAG140NY1',
            'serial_number' => 'DK-2023-004', 'location' => 'Rooftop – Block A',
            'address_label' => null,
            'notes' => 'Clean coils every 6 months. Replace filters quarterly.',
            'status' => 'active', 'purchase_offset' => -365, 'warranty_offset' => 365,
        ],
        [
            'code' => 'HVAC-002', 'type' => 'HVAC', 'name' => 'Split AC Unit – Server Room',
            'manufacturer' => 'Carrier', 'model' => '42QHC018DS8',
            'serial_number' => 'CA-2020-117', 'location' => 'Building A – Server Room 110',
            'address_label' => 'Floor 1, Room 110',
            'notes' => 'Critical — must maintain 22°C. Alert IT if offline.',
            'status' => 'active', 'purchase_offset' => -1000, 'warranty_offset' => -270,
        ],

        // Compressors
        [
            'code' => 'COMP-001', 'type' => 'COMP', 'name' => 'Rotary Screw Compressor #1',
            'manufacturer' => 'Atlas Copco', 'model' => 'GA 22 VSD+',
            'serial_number' => 'AC-2021-038', 'location' => 'Compressor Room – Building B',
            'address_label' => 'Ground Floor, West Wing',
            'notes' => 'Change oil every 4000 h. Check air dryer weekly.',
            'status' => 'active', 'purchase_offset' => -800, 'warranty_offset' => 200,
        ],
        [
            'code' => 'COMP-002', 'type' => 'COMP', 'name' => 'Piston Compressor – Backup',
            'manufacturer' => 'Ingersoll Rand', 'model' => 'T30 15T',
            'serial_number' => 'IR-2017-211', 'location' => 'Compressor Room – Building B',
            'address_label' => null,
            'notes' => 'Backup unit. Start weekly for 10 min to keep in readiness.',
            'status' => 'inactive', 'purchase_offset' => -2500, 'warranty_offset' => -1770,
        ],

        // Generators
        [
            'code' => 'GEN-001', 'type' => 'GEN', 'name' => 'Diesel Generator 250 kVA',
            'manufacturer' => 'Cummins', 'model' => 'C250D5',
            'serial_number' => 'CU-2020-001', 'location' => 'Generator Yard – East Gate',
            'address_label' => null,
            'notes' => 'Weekly test run required. Fuel level check every Monday.',
            'status' => 'active', 'purchase_offset' => -1100, 'warranty_offset' => -370,
        ],

        // Electrical Panels
        [
            'code' => 'ELEC-001', 'type' => 'ELEC', 'name' => 'Main Distribution Panel MCC-01',
            'manufacturer' => 'Schneider Electric', 'model' => 'Prisma P 2500A',
            'serial_number' => 'SE-2019-001', 'location' => 'MCC Room – Building A',
            'address_label' => 'Floor 0, Electrical Room',
            'notes' => 'Thermal imaging inspection every 12 months. Lock-out tag-out mandatory.',
            'status' => 'active', 'purchase_offset' => -1800, 'warranty_offset' => -1070,
        ],
        [
            'code' => 'ELEC-002', 'type' => 'ELEC', 'name' => 'Sub-Panel Production Line 1',
            'manufacturer' => 'ABB', 'model' => 'MNS 3.0',
            'serial_number' => 'ABB-2020-302', 'location' => 'Production Line 1 – Control Cabinet',
            'address_label' => null,
            'notes' => null,
            'status' => 'active', 'purchase_offset' => -1200, 'warranty_offset' => -470,
        ],

        // Conveyors
        [
            'code' => 'CONV-001', 'type' => 'CONV', 'name' => 'Belt Conveyor Line 1 – Infeed',
            'manufacturer' => 'Hytrol', 'model' => 'Model 190-BT',
            'serial_number' => 'HY-2021-015', 'location' => 'Production Line 1',
            'address_label' => 'Zone A, Infeed Station',
            'notes' => 'Lubricate chain weekly. Align belt monthly.',
            'status' => 'active', 'purchase_offset' => -700, 'warranty_offset' => 30,
        ],
        [
            'code' => 'CONV-002', 'type' => 'CONV', 'name' => 'Roller Conveyor – Packaging',
            'manufacturer' => 'Ashland', 'model' => 'RC-400-SS',
            'serial_number' => 'AS-2018-055', 'location' => 'Packaging Area – Building C',
            'address_label' => null,
            'notes' => null,
            'status' => 'under_maintenance', 'purchase_offset' => -2100, 'warranty_offset' => -1370,
        ],

        // Boilers
        [
            'code' => 'BOIL-001', 'type' => 'BOIL', 'name' => 'Steam Boiler 500 kW',
            'manufacturer' => 'Viessmann', 'model' => 'Vitoplex 200 SX2A',
            'serial_number' => 'VS-2018-003', 'location' => 'Boiler Room – Building A',
            'address_label' => 'Ground Floor, South End',
            'notes' => 'Annual pressure vessel inspection required by regulation. Water treatment log monthly.',
            'status' => 'active', 'purchase_offset' => -2200, 'warranty_offset' => -1470,
        ],

        // Vehicles
        [
            'code' => 'VEH-001', 'type' => 'VEH', 'name' => 'Forklift – Toyota 8FBM20',
            'manufacturer' => 'Toyota', 'model' => '8FBM20',
            'serial_number' => 'TY-8FBM-2021-07', 'location' => 'Main Warehouse',
            'address_label' => null,
            'notes' => 'Electric forklift. Battery charge check daily. Annual inspection due.',
            'status' => 'active', 'purchase_offset' => -800, 'warranty_offset' => 200,
        ],

        // IT / Computer
        [
            'code' => 'IT-001', 'type' => 'IT', 'name' => 'SCADA Server – Production',
            'manufacturer' => 'Dell', 'model' => 'PowerEdge R750',
            'serial_number' => 'DL-R750-2022-11', 'location' => 'Server Room – Building A',
            'address_label' => 'Floor 1, Room 110, Rack 3',
            'notes' => 'Critical system. Redundant power supply. UPS check monthly.',
            'status' => 'active', 'purchase_offset' => -500, 'warranty_offset' => 760,
        ],

        // Other
        [
            'code' => 'OTH-001', 'type' => 'OTHER', 'name' => 'Industrial Weighing Scale #1',
            'manufacturer' => 'Mettler Toledo', 'model' => 'ICS685s',
            'serial_number' => 'MT-2020-028', 'location' => 'Shipping & Receiving – Dock 1',
            'address_label' => null,
            'notes' => 'Calibrate every 6 months. Legal-for-trade certified.',
            'status' => 'active', 'purchase_offset' => -1050, 'warranty_offset' => -320,
        ],
        [
            'code' => 'OTH-002', 'type' => 'OTHER', 'name' => 'Overhead Crane 5T',
            'manufacturer' => 'Konecranes', 'model' => 'XL5',
            'serial_number' => 'KC-2017-001', 'location' => 'Workshop Hall – Bay 1',
            'address_label' => null,
            'notes' => 'Annual load test and brake inspection required. Operator certification mandatory.',
            'status' => 'active', 'purchase_offset' => -2800, 'warranty_offset' => -2070,
        ],
    ];

    public function run(): void
    {
        // Ensure asset types exist
        $this->call(AssetTypeSeeder::class);

        $companies = Company::query()
            ->where('approval_status', 'approved')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No approved active companies found.');
            return;
        }

        $typeMap = AssetType::all()->keyBy('code');

        foreach ($companies as $company) {
            $count = 0;
            foreach ($this->templates as $tpl) {
                $type = $typeMap->get($tpl['type']);
                if (! $type) continue;

                $purchaseDate   = now()->addDays($tpl['purchase_offset'])->toDateString();
                $installedAt    = now()->addDays($tpl['purchase_offset'] + rand(7, 30));
                $warrantyEndAt  = now()->addDays($tpl['warranty_offset'])->toDateString();

                Asset::query()->firstOrCreate(
                    ['company_id' => $company->id, 'code' => $tpl['code']],
                    [
                        'asset_type_id' => $type->id,
                        'name'          => $tpl['name'],
                        'status'        => $tpl['status'],
                        'serial_number' => $tpl['serial_number'],
                        'manufacturer'  => $tpl['manufacturer'],
                        'model'         => $tpl['model'],
                        'location'      => $tpl['location'],
                        'address_label' => $tpl['address_label'],
                        'notes'         => $tpl['notes'],
                        'purchase_date' => $purchaseDate,
                        'warranty_end_at' => $warrantyEndAt,
                        'installed_at'  => $installedAt,
                    ],
                );
                $count++;
            }

            $this->command->info("Seeded assets for: {$company->name} — {$count} assets");
        }
    }
}
