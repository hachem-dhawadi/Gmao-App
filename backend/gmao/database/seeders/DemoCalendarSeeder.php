<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoCalendarSeeder extends Seeder
{
    public function run(): void
    {
        $company = DB::table('companies')->where('name', 'Demo Company')->first();
        if (! $company) {
            $this->command->warn('Demo Company not found.');
            return;
        }

        $cid  = $company->id;
        $now  = Carbon::now();

        // ── 1. Push existing active WO due dates into the future ─────────────
        // Spread the open/in_progress/on_hold WOs across the next 10 weeks
        $activeWos = DB::table('work_orders')
            ->where('company_id', $cid)
            ->whereIn('status', ['open', 'in_progress', 'on_hold'])
            ->pluck('id')
            ->toArray();

        // Assign future due dates with variety (some soon, some later)
        $futureDates = [
            Carbon::now()->addDays(2),
            Carbon::now()->addDays(3),
            Carbon::now()->addDays(4),
            Carbon::now()->addDays(5),
            Carbon::now()->addDays(6),
            Carbon::now()->addDays(8),
            Carbon::now()->addDays(10),
            Carbon::now()->addDays(11),
            Carbon::now()->addDays(13),
            Carbon::now()->addDays(14),
            Carbon::now()->addDays(15),
            Carbon::now()->addDays(17),
            Carbon::now()->addDays(18),
            Carbon::now()->addDays(20),
            Carbon::now()->addDays(21),
            Carbon::now()->addDays(24),
            Carbon::now()->addDays(25),
            Carbon::now()->addDays(28),
            Carbon::now()->addDays(30),
            Carbon::now()->addDays(32),
        ];

        foreach ($activeWos as $i => $woId) {
            $date = $futureDates[$i % count($futureDates)]->copy()->addDays((int)($i / count($futureDates)) * 7);
            DB::table('work_orders')->where('id', $woId)->update(['due_at' => $date->toDateTimeString()]);
        }

        // ── 2. Delete existing generic custom events to replace with richer ones
        // (keep any that look hand-crafted — we just wipe demo ones)
        DB::table('calendar_events')->where('company_id', $cid)->delete();

        // ── 3. Members for assigning events ──────────────────────────────────
        $members = DB::table('members')->where('company_id', $cid)->pluck('id')->toArray();
        $m = fn(int $i) => $members[$i % count($members)];

        // ── 4. Build custom calendar events ──────────────────────────────────
        $events = [];

        // ─ Weekly Maintenance Review Meetings (every Monday for 8 weeks) ─────
        for ($w = 0; $w < 8; $w++) {
            $monday = Carbon::now()->startOfWeek()->addWeeks($w);
            $events[] = [
                'title'    => 'Weekly Maintenance Review — Team Meeting',
                'start_at' => $monday->copy()->setTime(8, 0),
                'end_at'   => $monday->copy()->setTime(9, 0),
                'color'    => '#3B82F6',
                'member_id' => $m(4), // Maintenance Manager
            ];
        }

        // ─ Monthly KPI & Performance Review ──────────────────────────────────
        foreach ([1, 2, 3] as $mo) {
            $date = Carbon::now()->addMonths($mo)->startOfMonth()->next(Carbon::TUESDAY);
            $events[] = [
                'title'    => 'Monthly KPI Review — Management Meeting',
                'start_at' => $date->copy()->setTime(10, 0),
                'end_at'   => $date->copy()->setTime(12, 0),
                'color'    => '#8B5CF6',
                'member_id' => $m(0), // Owner
            ];
        }

        // ─ Planned Maintenance Shutdowns ─────────────────────────────────────
        $shutdown1 = Carbon::now()->addDays(12)->startOfDay();
        $events[] = [
            'title'    => 'Planned Shutdown — Line 1 Full Overhaul',
            'start_at' => $shutdown1->copy()->setTime(6, 0),
            'end_at'   => $shutdown1->copy()->addDays(2)->setTime(18, 0),
            'color'    => '#EF4444',
            'member_id' => $m(2), // Operations Manager
        ];

        $shutdown2 = Carbon::now()->addDays(35)->startOfDay();
        $events[] = [
            'title'    => 'Planned Shutdown — Boiler Annual Inspection',
            'start_at' => $shutdown2->copy()->setTime(7, 0),
            'end_at'   => $shutdown2->copy()->addDays(1)->setTime(17, 0),
            'color'    => '#EF4444',
            'member_id' => $m(4), // Maintenance Manager
        ];

        $shutdown3 = Carbon::now()->addDays(58)->startOfDay();
        $events[] = [
            'title'    => 'Planned Shutdown — HVAC Seasonal Maintenance',
            'start_at' => $shutdown3->copy()->setTime(6, 0),
            'end_at'   => $shutdown3->copy()->addDays(1)->setTime(16, 0),
            'color'    => '#EF4444',
            'member_id' => $m(4),
        ];

        // ─ Safety Training Sessions ───────────────────────────────────────────
        $safetyDates = [
            [Carbon::now()->addDays(7)->setTime(14, 0),  'LOTO Refresher Training — All Technicians',         '#F59E0B'],
            [Carbon::now()->addDays(21)->setTime(9, 0),  'Fire Safety & Evacuation Drill',                    '#F97316'],
            [Carbon::now()->addDays(42)->setTime(14, 0), 'Working at Heights Safety Training',                '#F59E0B'],
            [Carbon::now()->addDays(56)->setTime(9, 0),  'Chemical Handling & SDS Awareness Session',         '#F97316'],
            [Carbon::now()->addDays(70)->setTime(14, 0), 'First Aid Refresher — Certified First Responders',  '#F59E0B'],
            [Carbon::now()->addDays(84)->setTime(10, 0), 'Confined Space Entry Awareness Training',           '#F97316'],
        ];

        foreach ($safetyDates as [$start, $title, $color]) {
            $events[] = [
                'title'    => $title,
                'start_at' => $start,
                'end_at'   => $start->copy()->addHours(2),
                'color'    => $color,
                'member_id' => $m(2),
            ];
        }

        // ─ Scheduled Inspections & Audits ────────────────────────────────────
        $audits = [
            [Carbon::now()->addDays(9)->setTime(8, 30),  'Internal Safety Audit — Site A',              '#10B981'],
            [Carbon::now()->addDays(16)->setTime(9, 0),  'ISO 45001 Pre-Audit Review',                  '#10B981'],
            [Carbon::now()->addDays(28)->setTime(8, 0),  'Insurance Inspection — Pressure Vessels',     '#06B6D4'],
            [Carbon::now()->addDays(44)->setTime(9, 0),  'External Electrical Installation Audit',      '#10B981'],
            [Carbon::now()->addDays(60)->setTime(8, 30), 'ISO 55001 Asset Management Audit',            '#10B981'],
            [Carbon::now()->addDays(75)->setTime(9, 0),  'Annual Fire Safety Compliance Inspection',    '#06B6D4'],
            [Carbon::now()->addDays(88)->setTime(8, 0),  'Environmental Compliance Audit — Site B',     '#10B981'],
        ];

        foreach ($audits as [$start, $title, $color]) {
            $events[] = [
                'title'    => $title,
                'start_at' => $start,
                'end_at'   => $start->copy()->addHours(4),
                'color'    => $color,
                'member_id' => $m(2),
            ];
        }

        // ─ Vendor & Contractor Visits ─────────────────────────────────────────
        $vendors = [
            [Carbon::now()->addDays(5)->setTime(10, 0),  'Siemens — Preventive Maintenance Visit',       '#6366F1'],
            [Carbon::now()->addDays(18)->setTime(14, 0), 'ABB Robotics — Annual Service Contract',       '#6366F1'],
            [Carbon::now()->addDays(33)->setTime(9, 0),  'Schneider Electric — PLC Firmware Update',     '#6366F1'],
            [Carbon::now()->addDays(47)->setTime(10, 0), 'Elevator & Lifting Equipment — Annual Check',  '#8B5CF6'],
            [Carbon::now()->addDays(62)->setTime(9, 30), 'Chiller Service — Carrier Technician Visit',   '#6366F1'],
            [Carbon::now()->addDays(80)->setTime(14, 0), 'Fire Suppression — Tyco Annual Inspection',    '#8B5CF6'],
        ];

        foreach ($vendors as [$start, $title, $color]) {
            $events[] = [
                'title'    => $title,
                'start_at' => $start,
                'end_at'   => $start->copy()->addHours(3),
                'color'    => $color,
                'member_id' => $m(4),
            ];
        }

        // ─ Predictive Maintenance Rounds ──────────────────────────────────────
        $predictive = [
            [Carbon::now()->addDays(3)->setTime(7, 0),  'Vibration Analysis Round — All Rotating Equipment', '#84CC16'],
            [Carbon::now()->addDays(17)->setTime(7, 0), 'Thermography Scan — Electrical Panels & Motors',    '#84CC16'],
            [Carbon::now()->addDays(31)->setTime(7, 0), 'Oil Analysis Sampling — Gearboxes & Compressors',   '#84CC16'],
            [Carbon::now()->addDays(45)->setTime(7, 0), 'Vibration Analysis Round — Line 2 & Line 3',        '#84CC16'],
            [Carbon::now()->addDays(59)->setTime(7, 0), 'Ultrasonic Leak Detection — Compressed Air Network','#84CC16'],
            [Carbon::now()->addDays(73)->setTime(7, 0), 'Thermography Scan — HV Switchgear & Transformers',  '#84CC16'],
        ];

        foreach ($predictive as [$start, $title, $color]) {
            $events[] = [
                'title'    => $title,
                'start_at' => $start,
                'end_at'   => $start->copy()->addHours(5),
                'color'    => $color,
                'member_id' => $m(7), // Leila Mansouri (predictive team)
            ];
        }

        // ─ Team-specific recurring tasks ─────────────────────────────────────
        // Night shift team handover — every Sunday
        for ($w = 0; $w < 8; $w++) {
            $sunday = Carbon::now()->next(Carbon::SUNDAY)->addWeeks($w);
            $events[] = [
                'title'    => 'Night Shift — Week Handover Briefing',
                'start_at' => $sunday->copy()->setTime(21, 30),
                'end_at'   => $sunday->copy()->setTime(22, 0),
                'color'    => '#6366F1',
                'member_id' => $m(8), // Karim Trabelsi
            ];
        }

        // ─ Specific one-off events ────────────────────────────────────────────
        $oneOff = [
            [Carbon::now()->addDays(1)->setTime(8, 0),   'Emergency Preparedness Drill — Site A',             '#EF4444', 2],
            [Carbon::now()->addDays(6)->setTime(13, 0),  'Spare Parts Inventory Count — Stockroom A',         '#F59E0B', 4],
            [Carbon::now()->addDays(11)->setTime(9, 0),  'CMMS Data Review — Asset Register Update',          '#3B82F6', 4],
            [Carbon::now()->addDays(14)->setTime(8, 0),  'Crane Load Test — Overhead Crane Bay 3',             '#06B6D4', 8],
            [Carbon::now()->addDays(19)->setTime(10, 0), 'New Technician Onboarding — Workshop & Site Tour',   '#10B981', 4],
            [Carbon::now()->addDays(23)->setTime(9, 0),  'Quarterly Team Performance Review',                  '#8B5CF6', 4],
            [Carbon::now()->addDays(26)->setTime(14, 0), 'Spare Parts Reorder Review — Procurement Meeting',   '#F59E0B', 4],
            [Carbon::now()->addDays(38)->setTime(8, 0),  'Annual Asset Valuation — Physical Verification',     '#3B82F6', 2],
            [Carbon::now()->addDays(50)->setTime(9, 0),  'Production Manager Coordination Meeting',            '#8B5CF6', 4],
            [Carbon::now()->addDays(65)->setTime(14, 0), 'Year-End Maintenance Budget Planning Session',       '#6366F1', 0],
            [Carbon::now()->addDays(77)->setTime(8, 30), 'Emergency Generator Annual Load Bank Test',          '#EF4444', 8],
            [Carbon::now()->addDays(90)->setTime(9, 0),  'Q4 Maintenance Strategy Planning Workshop',          '#8B5CF6', 4],
        ];

        foreach ($oneOff as [$start, $title, $color, $memberIdx]) {
            $events[] = [
                'title'    => $title,
                'start_at' => $start,
                'end_at'   => $start->copy()->addHours(2),
                'color'    => $color,
                'member_id' => $m($memberIdx),
            ];
        }

        // ── 5. Insert all events ──────────────────────────────────────────────
        $inserted = 0;
        foreach ($events as $event) {
            DB::table('calendar_events')->insert([
                'company_id' => $cid,
                'member_id'  => $event['member_id'],
                'title'      => $event['title'],
                'start_at'   => $event['start_at']->toDateTimeString(),
                'end_at'     => $event['end_at']->toDateTimeString(),
                'color'      => $event['color'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $inserted++;
        }

        $total = DB::table('calendar_events')->where('company_id', $cid)->count();
        $this->command->info("Calendar seeded: {$inserted} events inserted | Total: {$total} events");
        $this->command->info("Active WO due dates pushed forward for: ".count($activeWos)." work orders");
    }
}
