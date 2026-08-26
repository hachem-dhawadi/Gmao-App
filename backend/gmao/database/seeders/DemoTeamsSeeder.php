<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoTeamsSeeder extends Seeder
{
    public function run(): void
    {
        $company = DB::table('companies')->where('name', 'Demo Company')->first();
        if (! $company) {
            $this->command->warn('Demo Company not found.');
            return;
        }

        $cid = $company->id;

        // Sites
        $sites = DB::table('sites')->where('company_id', $cid)->pluck('id', 'name');
        $hqId  = $sites['Headquarters']    ?? null;
        $siteA = $sites['Production Site A'] ?? null;
        $siteB = $sites['Remote Site B']     ?? null;

        // Members (id => name for reference)
        // 1=Company Owner, 2=HR Manager, 3=Operations Manager, 4=Field Technician Up
        // 5=Maintenance Manager, 6=Technician Site B, 7=Ahmed Ben Salah,
        // 8=Leila Mansouri, 9=Karim Trabelsi, 10=Fatma Riahi,
        // 11=Yassine Chaabane, 12=Sonia Jebali, 13=Mohamed Belhaj, 14=Amira Oueslati

        $teams = [
            // ── Existing teams (update color/description if needed) ──────────
            // 1 = Mechanical Team  (members: 4, 6, 9)
            // 2 = Electrical Team  (members: 10, 11, 12)

            // ── New teams ────────────────────────────────────────────────────
            [
                'name'        => 'HVAC & Utilities Team',
                'description' => 'Responsible for all heating, ventilation, air conditioning, compressed air, and general utility systems across all sites.',
                'color'       => '#06B6D4',
                'members'     => [7, 13],   // Ahmed Ben Salah, Mohamed Belhaj
            ],
            [
                'name'        => 'Instrumentation & Control Team',
                'description' => 'Handles PLCs, sensors, transmitters, control panels, SCADA systems, and all instrumentation calibration tasks.',
                'color'       => '#8B5CF6',
                'members'     => [8, 14],   // Leila Mansouri, Amira Oueslati
            ],
            [
                'name'        => 'Site A — Production Team',
                'description' => 'Dedicated maintenance team for the Production Site A facility, covering all production-line corrective and preventive maintenance.',
                'color'       => '#F59E0B',
                'members'     => [4, 7, 11], // Field Technician Up, Ahmed Ben Salah, Yassine Chaabane
            ],
            [
                'name'        => 'Site B — Field Response Team',
                'description' => 'On-call rapid-response team stationed at Remote Site B, handling both corrective interventions and scheduled preventive rounds.',
                'color'       => '#EF4444',
                'members'     => [6, 13, 14], // Technician Site B, Mohamed Belhaj, Amira Oueslati
            ],
            [
                'name'        => 'Predictive Maintenance Team',
                'description' => 'Specialised team focused on condition monitoring, vibration analysis, thermography, and oil analysis to detect failures before they occur.',
                'color'       => '#10B981',
                'members'     => [8, 9, 12], // Leila Mansouri, Karim Trabelsi, Sonia Jebali
            ],
            [
                'name'        => 'Safety & Compliance Team',
                'description' => 'Coordinates safety inspections, risk assessments, LOTO audits, and regulatory compliance checks across all company sites.',
                'color'       => '#F97316',
                'members'     => [3, 10, 12], // Operations Manager, Fatma Riahi, Sonia Jebali
            ],
            [
                'name'        => 'Night Shift Maintenance Team',
                'description' => 'Covers all maintenance interventions during the night shift (22:00–06:00) to minimise production downtime during peak hours.',
                'color'       => '#6366F1',
                'members'     => [9, 11, 13], // Karim Trabelsi, Yassine Chaabane, Mohamed Belhaj
            ],
            [
                'name'        => 'Facilities & Civil Works Team',
                'description' => 'Manages building infrastructure including roofing, plumbing, lighting, painting, and general civil maintenance tasks at all locations.',
                'color'       => '#84CC16',
                'members'     => [4, 14],    // Field Technician Up, Amira Oueslati
            ],
        ];

        $inserted = 0;
        $updated  = 0;

        foreach ($teams as $team) {
            $members = $team['members'];
            unset($team['members']);

            $existing = DB::table('teams')
                ->where('company_id', $cid)
                ->where('name', $team['name'])
                ->first();

            if ($existing) {
                // Sync members for existing team
                foreach ($members as $memberId) {
                    $hasPivot = DB::table('team_member')
                        ->where('team_id', $existing->id)
                        ->where('member_id', $memberId)
                        ->exists();
                    if (! $hasPivot) {
                        DB::table('team_member')->insert([
                            'team_id'   => $existing->id,
                            'member_id' => $memberId,
                        ]);
                    }
                }
                $updated++;
                continue;
            }

            $teamId = DB::table('teams')->insertGetId([
                'company_id'  => $cid,
                'name'        => $team['name'],
                'description' => $team['description'],
                'color'       => $team['color'],
                'is_active'   => true,
                'created_at'  => now()->subDays(rand(10, 90)),
                'updated_at'  => now()->subDays(rand(0, 9)),
            ]);

            foreach ($members as $memberId) {
                DB::table('team_member')->insert([
                    'team_id'   => $teamId,
                    'member_id' => $memberId,
                ]);
            }

            $inserted++;
        }

        // Also give the existing teams colors and descriptions if missing
        DB::table('teams')->where('company_id', $cid)->where('name', 'Mechanical Team')
            ->update([
                'description' => 'Handles all mechanical maintenance tasks including pumps, compressors, gearboxes, bearings, belts, and hydraulic systems.',
                'color'       => '#3B82F6',
            ]);

        DB::table('teams')->where('company_id', $cid)->where('name', 'Electrical Team')
            ->update([
                'description' => 'Covers all electrical maintenance including motors, switchgear, transformers, wiring, and PLC-level troubleshooting.',
                'color'       => '#FBBF24',
            ]);

        $total = DB::table('teams')->where('company_id', $cid)->count();
        $this->command->info("Teams seeded: {$inserted} created, {$updated} updated | Total: {$total} teams");
    }
}
