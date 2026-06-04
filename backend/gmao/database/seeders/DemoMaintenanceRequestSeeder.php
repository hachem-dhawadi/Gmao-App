<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Company;
use App\Models\MaintenanceRequest;
use App\Models\Member;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Generates realistic maintenance requests for all approved companies.
 * Run: php artisan db:seed --class=DemoMaintenanceRequestSeeder
 */
class DemoMaintenanceRequestSeeder extends Seeder
{
    private array $requests = [
        [
            'title'       => 'Air compressor making loud grinding noise',
            'description' => 'The air compressor in Bay 3 started making a loud grinding noise since this morning. The noise gets worse under load. We had to reduce production speed to avoid a full breakdown. Requesting urgent inspection and repair.',
            'priority'    => 'critical',
            'location'    => 'Production Hall – Bay 3',
        ],
        [
            'title'       => 'Water leak under the cooling tower',
            'description' => 'There is a visible water leak at the base of Cooling Tower CT-02. The puddle has been growing since yesterday. This could indicate a cracked pipe or loose fitting. Needs to be checked before it causes floor damage.',
            'priority'    => 'high',
            'location'    => 'Roof Level – Cooling Unit Area',
        ],
        [
            'title'       => 'Office AC unit not cooling properly',
            'description' => 'The air conditioning unit in the main office (2nd floor) is running but not producing cold air. Room temperature is around 32°C. Employees are unable to work comfortably. Please inspect refrigerant level and compressor.',
            'priority'    => 'medium',
            'location'    => 'Office Building – Floor 2',
        ],
        [
            'title'       => 'Conveyor belt misalignment on Line 4',
            'description' => 'The conveyor belt on production line 4 is slightly misaligned and rubbing against the side frame. It is causing product jams every 20-30 minutes. We have been manually realigning it but this is a temporary fix.',
            'priority'    => 'high',
            'location'    => 'Production Hall – Line 4',
        ],
        [
            'title'       => 'Flickering lights in warehouse section B',
            'description' => 'Several ceiling lights in warehouse section B are flickering intermittently. This is causing eye strain for the warehouse staff and is a potential safety hazard. The issue has been going on for about a week.',
            'priority'    => 'medium',
            'location'    => 'Warehouse – Section B',
        ],
        [
            'title'       => 'Generator fuel gauge not working',
            'description' => 'The fuel level indicator on backup generator GEN-001 is stuck and not updating. We cannot tell the actual fuel level. Given the upcoming rainy season and potential power outages, this needs to be fixed urgently.',
            'priority'    => 'high',
            'location'    => 'Generator Room – Ground Floor',
        ],
        [
            'title'       => 'Elevator door not closing properly',
            'description' => 'The freight elevator door on floor 1 does not close fully on the first attempt. It requires 2-3 tries before it registers as closed. This is slowing down goods movement between floors significantly.',
            'priority'    => 'medium',
            'location'    => 'Building A – Freight Elevator',
        ],
        [
            'title'       => 'Hydraulic press oil leak',
            'description' => 'Hydraulic press HP-003 has a slow oil leak from the cylinder seal area. A small tray has been placed underneath to catch the drip. The press is still operational but the leak is worsening. Seal replacement needed.',
            'priority'    => 'high',
            'location'    => 'Workshop – Press Area',
        ],
        [
            'title'       => 'Fire extinguisher inspection overdue in Zone C',
            'description' => 'The fire extinguishers in Zone C (storage area) have not been inspected or serviced in over 12 months. Per safety regulations they must be checked annually. Please schedule an inspection as soon as possible.',
            'priority'    => 'medium',
            'location'    => 'Storage Zone C',
        ],
        [
            'title'       => 'Water pump motor overheating',
            'description' => 'The motor on water pump PMP-002 is running hot. Surface temperature measured at 78°C during normal operation, which is above the recommended 65°C. Checked and the cooling fan appears intact. May need bearing replacement or winding check.',
            'priority'    => 'critical',
            'location'    => 'Pump Room – Building B',
        ],
        [
            'title'       => 'Broken window in server room',
            'description' => 'One of the windows in the server room has a crack running from top to bottom. With the current weather conditions, there is a risk of water getting in and damaging the servers. Needs to be sealed or replaced urgently.',
            'priority'    => 'high',
            'location'    => 'Server Room – Floor 1',
        ],
        [
            'title'       => 'Forklift battery charging station faulty',
            'description' => 'The charging station for Forklift #2 is not completing full charge cycles. The battery shows full after 2 hours but discharges within 3 hours of use. The charger indicator light stays red even after overnight charging.',
            'priority'    => 'medium',
            'location'    => 'Warehouse – Charging Bay',
        ],
        [
            'title'       => 'HVAC filter replacement in production area',
            'description' => 'The HVAC filters in the main production area are visibly clogged with dust and debris. Airflow has noticeably decreased and staff have been complaining about air quality. Filters appear to be 4-5 months past their change interval.',
            'priority'    => 'low',
            'location'    => 'Production Hall – HVAC Unit 1',
        ],
        [
            'title'       => 'Paint peeling on exterior walls near loading dock',
            'description' => 'The exterior walls near the loading dock have significant paint peeling and exposed concrete. While not an urgent safety issue, it presents a poor image for visiting clients and may lead to concrete degradation if left untreated.',
            'priority'    => 'low',
            'location'    => 'Exterior – Loading Dock Side',
        ],
        [
            'title'       => 'CNC machine spindle vibration issue',
            'description' => 'CNC Machine #5 has developed an unusual vibration in the spindle at speeds above 8000 RPM. Surface finish quality on machined parts has degraded noticeably. Suspected worn spindle bearings or imbalanced toolholder.',
            'priority'    => 'critical',
            'location'    => 'Machining Center – Station 5',
        ],
        [
            'title'       => 'Restroom plumbing – slow drain in sink',
            'description' => 'The sink drain in the men\'s restroom on floor 2 is draining very slowly. Water pools up for about 30 seconds after use. Likely a clog in the drain pipe. Please send a plumber to clear it.',
            'priority'    => 'low',
            'location'    => 'Floor 2 – Men\'s Restroom',
        ],
        [
            'title'       => 'Emergency stop button unresponsive on Line 2',
            'description' => 'CRITICAL SAFETY ISSUE: The emergency stop button on production line 2 did not respond during a safety drill today. The line had to be stopped manually from the control panel. This must be fixed immediately before the line restarts.',
            'priority'    => 'critical',
            'location'    => 'Production Hall – Line 2',
        ],
        [
            'title'       => 'Dust extraction system losing suction',
            'description' => 'The central dust extraction system serving the sanding station has been losing suction over the past 2 weeks. Dust is now accumulating on surfaces and equipment. Filter may be blocked or the fan motor could be weakening.',
            'priority'    => 'medium',
            'location'    => 'Finishing Area – Sanding Station',
        ],
    ];

    private array $reviewNotes = [
        'converted' => [
            'Request validated. Work order created for immediate action.',
            'Issue confirmed during site visit. Assigned to maintenance team.',
            'Priority confirmed. Parts ordered, WO created.',
            'Inspected on site — issue is real and needs immediate repair. WO raised.',
            'Approved and escalated to senior technician. Work order created.',
        ],
        'rejected'  => [
            'After inspection, no fault was found. Equipment is operating within normal parameters.',
            'This falls under the operator\'s daily maintenance checklist, not a maintenance request.',
            'Duplicate request — already covered under WO-0234.',
            'Request declined — the reported issue was resolved by the operator during shift.',
            'Not a maintenance issue. Referred to facilities management.',
        ],
    ];

    public function run(): void
    {
        $companies = Company::where('approval_status', 'approved')->get();

        foreach ($companies as $company) {
            $members = Member::where('company_id', $company->id)
                ->where('status', 'active')
                ->get();

            if ($members->count() < 2) {
                continue;
            }

            $assets = Asset::where('company_id', $company->id)->get();
            $counter = 1;

            foreach ($this->requests as $i => $req) {
                $requestedBy = $members->random();
                $reviewedBy  = $members->where('id', '!=', $requestedBy->id)->random();
                $asset       = $assets->isNotEmpty() && rand(0, 1) ? $assets->random() : null;

                // Distribute statuses: ~50% pending, ~35% converted, ~15% rejected
                $rand = $i % 20;
                if ($rand < 10)      $status = 'pending';
                elseif ($rand < 17)  $status = 'converted';
                else                 $status = 'rejected';

                $code = 'MR-' . str_pad($counter++, 4, '0', STR_PAD_LEFT);

                $workOrderId = null;
                if ($status === 'converted') {
                    $wo = WorkOrder::where('company_id', $company->id)->inRandomOrder()->first();
                    $workOrderId = $wo?->id;
                }

                $reviewNote = null;
                if ($status !== 'pending') {
                    $notes      = $this->reviewNotes[$status];
                    $reviewNote = $notes[array_rand($notes)];
                }

                MaintenanceRequest::create([
                    'company_id'             => $company->id,
                    'code'                   => $code,
                    'title'                  => $req['title'],
                    'description'            => $req['description'],
                    'priority'               => $req['priority'],
                    'status'                 => $status,
                    'asset_id'               => $asset?->id,
                    'location'               => $asset?->location ?? $req['location'],
                    'requested_by_member_id' => $requestedBy->id,
                    'reviewed_by_member_id'  => $status !== 'pending' ? $reviewedBy->id : null,
                    'review_note'            => $reviewNote,
                    'work_order_id'          => $workOrderId,
                    'created_at'             => Carbon::now()->subDays(rand(1, 60)),
                    'updated_at'             => Carbon::now()->subDays(rand(0, 5)),
                ]);
            }
        }

        $this->command->info('✅ Maintenance requests seeded successfully.');
    }
}
