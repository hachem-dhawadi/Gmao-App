<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Company;
use App\Models\Member;
use App\Models\Site;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Creates 3 sites per approved company and wires site_id FK into
 * assets, warehouses, members, and work orders.
 *
 * Run: php artisan db:seed --class=DemoSiteSeeder
 */
class DemoSiteSeeder extends Seeder
{
    private array $siteTemplates = [
        [
            'code'        => 'HQ',
            'name'        => 'Headquarters',
            'description' => 'Main administrative and operations headquarters',
            'address'     => '1 Industrial Boulevard, Building A',
            'is_active'   => true,
        ],
        [
            'code'        => 'SITE-A',
            'name'        => 'Production Site A',
            'description' => 'Primary manufacturing and production facility',
            'address'     => '25 Factory Road, Production Zone',
            'is_active'   => true,
        ],
        [
            'code'        => 'SITE-B',
            'name'        => 'Remote Site B',
            'description' => 'Secondary facility and utility operations',
            'address'     => '8 Industrial Park, Site B',
            'is_active'   => true,
        ],
    ];

    // Asset code prefix (before first "-") → site code
    private array $assetPrefixSiteMap = [
        'ELEC' => 'HQ',
        'HVAC' => 'HQ',
        'IT'   => 'HQ',
        'BOIL' => 'HQ',
        'PMP'  => 'SITE-A',
        'MOT'  => 'SITE-A',
        'COMP' => 'SITE-A',
        'CONV' => 'SITE-A',
        'GEN'  => 'SITE-B',
        'VEH'  => 'SITE-B',
        'OTH'  => 'SITE-B',
    ];

    // Warehouse code → site code
    private array $warehouseSiteMap = [
        'WH-01' => 'HQ',
        'WH-02' => 'SITE-A',
        'WH-03' => 'SITE-B',
        'WH-04' => 'HQ',
        'WH-05' => 'HQ',
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
            // ── 1. Create / update sites ──────────────────────────────────
            /** @var array<string, int> $siteMap code → id */
            $siteMap = [];
            foreach ($this->siteTemplates as $tpl) {
                $site = Site::query()->updateOrCreate(
                    ['company_id' => $company->id, 'code' => $tpl['code']],
                    [
                        'name'        => $tpl['name'],
                        'description' => $tpl['description'],
                        'address'     => $tpl['address'],
                        'timezone'    => $company->timezone ?? 'UTC',
                        'is_active'   => $tpl['is_active'],
                    ]
                );
                $siteMap[$tpl['code']] = $site->id;
            }

            // ── 2. Assign sites to assets ─────────────────────────────────
            Asset::query()
                ->where('company_id', $company->id)
                ->whereNull('deleted_at')
                ->get(['id', 'code'])
                ->each(function (Asset $asset) use ($siteMap): void {
                    $prefix  = explode('-', $asset->code)[0];
                    $siteCode = $this->assetPrefixSiteMap[$prefix] ?? 'HQ';
                    $asset->update(['site_id' => $siteMap[$siteCode] ?? $siteMap['HQ']]);
                });

            // ── 3. Assign sites to warehouses ─────────────────────────────
            Warehouse::query()
                ->where('company_id', $company->id)
                ->get(['id', 'code'])
                ->each(function (Warehouse $wh) use ($siteMap): void {
                    $siteCode = $this->warehouseSiteMap[$wh->code] ?? 'HQ';
                    $wh->update(['site_id' => $siteMap[$siteCode] ?? $siteMap['HQ']]);
                });

            // ── 4. Assign sites to members (site_id + member_sites pivot) ──
            $techIndex    = 0;
            $managerIndex = 0;
            Member::query()
                ->where('company_id', $company->id)
                ->with('roles:id,code')
                ->orderBy('id')
                ->get()
                ->each(function (Member $member) use ($siteMap, &$techIndex, &$managerIndex): void {
                    $roleCodes = $member->roles->pluck('code')->toArray();

                    if (in_array('admin', $roleCodes, true) || in_array('hr', $roleCodes, true)) {
                        $siteCode = 'HQ';
                    } elseif (in_array('manager', $roleCodes, true)) {
                        // Managers alternate: SITE-A (MGR-001), SITE-B (MGR-002), …
                        $siteCode = $managerIndex % 2 === 0 ? 'SITE-A' : 'SITE-B';
                        $managerIndex++;
                    } else {
                        // Technicians alternate between SITE-A and SITE-B
                        $siteCode = $techIndex % 2 === 0 ? 'SITE-A' : 'SITE-B';
                        $techIndex++;
                    }

                    $siteId = $siteMap[$siteCode] ?? $siteMap['HQ'];
                    $member->update(['site_id' => $siteId]);

                    // Populate member_sites pivot
                    DB::table('member_sites')->insertOrIgnore([
                        'member_id'  => $member->id,
                        'site_id'    => $siteId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });

            // ── 5. Derive work order site_id from their asset ─────────────
            DB::statement(
                'UPDATE work_orders wo
                 JOIN assets a ON wo.asset_id = a.id
                 SET wo.site_id = a.site_id
                 WHERE wo.company_id = ?
                   AND wo.deleted_at IS NULL',
                [$company->id]
            );

            // Fallback: WOs whose asset was deleted / had no site → assign HQ
            DB::statement(
                'UPDATE work_orders
                 SET site_id = ?
                 WHERE company_id = ?
                   AND deleted_at IS NULL
                   AND site_id IS NULL',
                [$siteMap['HQ'], $company->id]
            );

            $this->command->info(
                "✓ {$company->name} — 3 sites created, assets / warehouses / members / WOs updated"
            );
        }

        $this->command->info('DemoSiteSeeder complete.');
    }
}
