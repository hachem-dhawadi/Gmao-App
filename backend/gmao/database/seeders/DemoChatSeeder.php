<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoChatSeeder extends Seeder
{
    private int $companyId;

    /** member_id resolved by email / name at runtime */
    private array $m = [];

    public function run(): void
    {
        // Accept any approved company; prefer one named "Demo Company" if it exists
        $company = DB::table('companies')->where('name', 'Demo Company')->first()
            ?? DB::table('companies')->where('approval_status', 'approved')->orderBy('id')->first()
            ?? DB::table('companies')->orderBy('id')->first();
        if (! $company) {
            $this->command->warn('No company found in the database.');
            return;
        }
        $this->command->info("Using company: {$company->name} (ID: {$company->id})");
        $this->companyId = $company->id;

        // ── Resolve member IDs dynamically ────────────────────────────────
        $this->m = $this->resolveMembers();

        $missing = array_filter($this->m, fn ($id) => $id === null);
        if (! empty($missing)) {
            $this->command->warn('Some members not found: ' . implode(', ', array_keys($missing)));
        }

        // ── Direct conversations ──────────────────────────────────────────
        $this->direct('OWNER', 'MAINT',
            Carbon::now()->subDays(2)->setTime(8, 15),
            $this->ownerMaintManagerThread());

        $this->direct('OWNER', 'OPS',
            Carbon::now()->subDays(5)->setTime(9, 0),
            $this->ownerOpsManagerThread());

        $this->direct('OWNER', 'HR',
            Carbon::now()->subDays(3)->setTime(10, 30),
            $this->ownerHrThread());

        $this->direct('OWNER', 'TECH1',
            Carbon::now()->subDays(1)->setTime(7, 45),
            $this->ownerTech1Thread());

        $this->direct('OWNER', 'LEILA',
            Carbon::now()->subDays(4)->setTime(14, 0),
            $this->ownerLeilaThread());

        $this->direct('OWNER', 'AHMED',
            Carbon::now()->subDays(6)->setTime(11, 0),
            $this->ownerAhmedThread());

        $this->direct('OWNER', 'KARIM',
            Carbon::now()->subHours(18),
            $this->ownerKarimThread());

        $this->direct('OWNER', 'SONIA',
            Carbon::now()->subDays(7)->setTime(15, 20),
            $this->ownerSoniaThread());

        // ── Group conversations ───────────────────────────────────────────
        $this->group(
            'Management Committee', null, 'OWNER',
            ['OWNER', 'HR', 'OPS', 'MAINT'],
            Carbon::now()->subDays(10)->setTime(9, 0),
            $this->mgmtCommitteeThread());

        $this->group(
            'Emergency — Boiler Line 2 Shutdown', null, 'OWNER',
            ['OWNER', 'MAINT', 'OPS', 'TECH1', 'KARIM'],
            Carbon::now()->subDays(1)->setTime(6, 30),
            $this->emergencyBoilerThread());

        $this->group(
            'Q4 Budget & CAPEX Planning', null, 'OWNER',
            ['OWNER', 'HR', 'OPS', 'MAINT'],
            Carbon::now()->subDays(8)->setTime(10, 0),
            $this->budgetPlanningThread());

        $this->group(
            'Predictive Maintenance Initiative', null, 'OWNER',
            ['OWNER', 'MAINT', 'LEILA', 'KARIM', 'SONIA'],
            Carbon::now()->subDays(12)->setTime(13, 0),
            $this->predictiveMaintenanceThread());

        $this->group(
            'ISO 45001 Safety Audit Prep', null, 'OWNER',
            ['OWNER', 'OPS', 'FATMA', 'SONIA', 'AMIRA'],
            Carbon::now()->subDays(6)->setTime(9, 30),
            $this->safetyAuditThread());

        $this->group(
            'New Technician Onboarding — Yassine & Mohamed', null, 'HR',
            ['OWNER', 'HR', 'MAINT', 'YASSINE', 'MOHAMED'],
            Carbon::now()->subDays(14)->setTime(8, 0),
            $this->onboardingThread());

        $this->group(
            'Night Shift Coordination', null, 'KARIM',
            ['OWNER', 'MAINT', 'KARIM', 'YASSINE', 'MOHAMED'],
            Carbon::now()->subDays(3)->setTime(21, 30),
            $this->nightShiftThread());

        $this->command->info('✓ DemoChatSeeder completed.');
    }

    // ── Dynamic member resolution ──────────────────────────────────────────

    private function resolveMembers(): array
    {
        $cid = $this->companyId;

        // Fetch all active members in this company with their role codes
        $members = DB::table('members')
            ->join('users', 'users.id', '=', 'members.user_id')
            ->leftJoin('member_roles', 'member_roles.member_id', '=', 'members.id')
            ->leftJoin('roles', 'roles.id', '=', 'member_roles.role_id')
            ->where('members.company_id', $cid)
            ->whereNull('members.deleted_at')
            ->select('members.id', 'users.email', 'users.name', 'roles.code as role_code')
            ->orderBy('members.id')
            ->get()
            ->groupBy('id')
            ->map(fn ($rows) => [
                'id'        => $rows->first()->id,
                'email'     => $rows->first()->email,
                'name'      => $rows->first()->name,
                'role_code' => $rows->pluck('role_code')->filter()->values()->toArray(),
            ])
            ->values();

        $this->command->info("Found {$members->count()} members in company.");

        // Bucket by role
        $admins  = $members->filter(fn ($m) => in_array('admin',      $m['role_code']))->values();
        $managers= $members->filter(fn ($m) => in_array('manager',    $m['role_code']))->values();
        $techs   = $members->filter(fn ($m) => in_array('technician', $m['role_code']))->values();
        $others  = $members->filter(fn ($m) => empty($m['role_code']))->values();

        // Assign slots: OWNER = first admin, managers, techs, fill remaining from any role
        $all = $members->values();

        $pick = function (int $idx) use ($all): ?int {
            return $all->get($idx)['id'] ?? null;
        };
        $pickFrom = function ($col, int $idx) {
            return $col->get($idx)['id'] ?? null;
        };

        return [
            'OWNER'   => $pickFrom($admins,  0),
            'HR'      => $pickFrom($managers, 0) ?? $pickFrom($admins, 1),
            'OPS'     => $pickFrom($managers, 1) ?? $pickFrom($admins, 2),
            'TECH1'   => $pickFrom($techs,   0),
            'MAINT'   => $pickFrom($managers, 2) ?? $pickFrom($admins, 3),
            'TECH2'   => $pickFrom($techs,   1),
            'AHMED'   => $pickFrom($techs,   2) ?? $pick(6),
            'LEILA'   => $pickFrom($techs,   3) ?? $pick(7),
            'KARIM'   => $pickFrom($techs,   4) ?? $pick(8),
            'FATMA'   => $pickFrom($techs,   5) ?? $pick(9),
            'YASSINE' => $pickFrom($techs,   6) ?? $pick(10),
            'SONIA'   => $pickFrom($techs,   7) ?? $pick(11),
            'MOHAMED' => $pickFrom($techs,   8) ?? $pick(12),
            'AMIRA'   => $pickFrom($techs,   9) ?? $pick(13),
        ];
    }

    private function id(string $key): ?int
    {
        return $this->m[$key] ?? null;
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function direct(string $keyA, string $keyB, Carbon $baseTime, array $messages): void
    {
        $a = $this->id($keyA);
        $b = $this->id($keyB);
        if (! $a || ! $b) {
            $this->command->warn("Skipping direct {$keyA}↔{$keyB}: member not found.");
            return;
        }

        // Skip if already exists
        $aConvs = DB::table('conversation_members')->where('member_id', $a)->pluck('conversation_id')->toArray();
        $bConvs = DB::table('conversation_members')->where('member_id', $b)->pluck('conversation_id')->toArray();
        $shared  = array_intersect($aConvs, $bConvs);
        if (! empty($shared)) {
            $exists = DB::table('conversations')
                ->whereIn('id', $shared)
                ->where('company_id', $this->companyId)
                ->where('type', 'direct')
                ->exists();
            if ($exists) return;
        }

        $convId = DB::table('conversations')->insertGetId([
            'company_id'           => $this->companyId,
            'type'                 => 'direct',
            'name'                 => null,
            'avatar'               => null,
            'created_by_member_id' => $a,
            'created_at'           => $baseTime,
            'updated_at'           => $baseTime,
        ]);

        foreach ([$a, $b] as $mid) {
            DB::table('conversation_members')->insert([
                'conversation_id' => $convId,
                'member_id'       => $mid,
                'last_read_at'    => now(),
                'joined_at'       => $baseTime,
                'created_at'      => $baseTime,
                'updated_at'      => $baseTime,
            ]);
        }

        $this->insertMessages($convId, $messages, $baseTime);
        $this->command->info("  ✓ Direct: {$keyA} ↔ {$keyB}");
    }

    private function group(string $name, ?string $avatar, string $creatorKey, array $memberKeys, Carbon $baseTime, array $messages): void
    {
        $creator = $this->id($creatorKey);
        if (! $creator) {
            $this->command->warn("Skipping group '{$name}': creator not found.");
            return;
        }

        // Skip if a group with this name already exists for this company
        if (DB::table('conversations')->where('company_id', $this->companyId)->where('name', $name)->exists()) {
            $this->command->warn("  Skipping group '{$name}': already exists.");
            return;
        }

        $memberIds = array_values(array_unique(array_filter(array_map(fn ($k) => $this->id($k), $memberKeys))));
        if (count($memberIds) < 2) {
            $this->command->warn("Skipping group '{$name}': fewer than 2 members resolved.");
            return;
        }

        $convId = DB::table('conversations')->insertGetId([
            'company_id'           => $this->companyId,
            'type'                 => 'group',
            'name'                 => $name,
            'avatar'               => $avatar,
            'created_by_member_id' => $creator,
            'created_at'           => $baseTime,
            'updated_at'           => $baseTime,
        ]);

        foreach ($memberIds as $mid) {
            DB::table('conversation_members')->insert([
                'conversation_id' => $convId,
                'member_id'       => $mid,
                'last_read_at'    => now(),
                'joined_at'       => $baseTime,
                'created_at'      => $baseTime,
                'updated_at'      => $baseTime,
            ]);
        }

        $this->insertMessages($convId, $messages, $baseTime);
        $this->command->info("  ✓ Group: {$name}");
    }

    private function insertMessages(int $convId, array $messages, Carbon $baseTime): void
    {
        $time = $baseTime->copy();
        foreach ($messages as [$senderKey, $body]) {
            $senderId = $this->id($senderKey);
            if (! $senderId) continue;

            $time->addMinutes(rand(2, 12));
            DB::table('messages')->insert([
                'conversation_id'  => $convId,
                'sender_member_id' => $senderId,
                'body'             => $body,
                'type'             => 'text',
                'created_at'       => $time->copy(),
                'updated_at'       => $time->copy(),
            ]);
        }
        DB::table('conversations')->where('id', $convId)->update(['updated_at' => $time]);
    }

    // ── Direct conversation scripts ─────────────────────────────────────────

    private function ownerMaintManagerThread(): array
    {
        return [
            ['OWNER', 'Good morning Khalil. Can you give me a quick update on the status of the open work orders? I have a board meeting this afternoon and need the numbers.'],
            ['MAINT', 'Good morning. As of this morning we have 18 open WOs — 4 critical, 7 high, 5 medium, 2 low. The 4 critical ones are all on Line 1 equipment, two are already assigned and in progress.'],
            ['OWNER', 'What\'s blocking the other two critical ones?'],
            ['MAINT', 'Waiting on a bearing from our supplier. ETA is tomorrow morning. I\'ve escalated it with the purchasing team. Karim\'s team is ready to install as soon as it arrives.'],
            ['OWNER', 'Alright. Can you also send me the overdue WO list? I want to see if there\'s a pattern in which assets are generating the most corrective work.'],
            ['MAINT', 'I\'ll pull the report right now. Looking at last 90 days, the centrifugal pump CP-003 and the conveyor drive CB-007 are the top two — 6 and 5 WOs respectively. I think we need to review their PM plans.'],
            ['OWNER', 'Agreed. Let\'s schedule a reliability review for those two assets next week. Add it to the CMMS calendar and invite the ops team.'],
            ['MAINT', 'Done. I\'ll also prepare a cost analysis — repair vs. replace for both assets. Should have it ready by Thursday.'],
            ['OWNER', 'Perfect. One more thing — how is the new Predictive Maintenance program going with Leila\'s team?'],
            ['MAINT', 'Very promising. First vibration analysis round is complete. They found early-stage imbalance on Motor M-012 before it became a failure. We\'ve scheduled a corrective PM. That\'s exactly the kind of early detection we needed.'],
            ['OWNER', 'Excellent. Let\'s make sure that result is included in the board presentation today. It\'s a great story for the ROI of the program.'],
            ['MAINT', 'Will do. I\'ll send you a one-page summary by 2pm.'],
        ];
    }

    private function ownerOpsManagerThread(): array
    {
        return [
            ['OPS',   'Sami, I need to flag something urgent. The Line 2 conveyor stopped at 14:30 this afternoon. Technician is on site but we need to know the impact on today\'s production schedule.'],
            ['OWNER', 'Thanks for the alert Rami. What\'s the estimated downtime?'],
            ['OPS',   'Technician says 3 to 4 hours. We\'re looking at losing the afternoon shift production. I\'m rerouting what I can to Line 3 but capacity there is limited.'],
            ['OWNER', 'Is this the same conveyor we had issues with last month?'],
            ['OPS',   'Yes. Third failure in 6 weeks. Maintenance has a WO open for a full chain replacement but the parts order was delayed twice by procurement.'],
            ['OWNER', 'I\'m sending a message to procurement right now. This needs to be escalated. We cannot afford this level of downtime on that line.'],
            ['OPS',   'Agreed. Also, I want to propose a meeting with maintenance and procurement this week to review all pending parts orders for critical equipment.'],
            ['OWNER', 'Absolutely. Set it up for Wednesday morning, 9am. Make sure Khalil and the purchasing manager are both there.'],
            ['OPS',   'Will do. I\'ll send the calendar invite now.'],
            ['OWNER', 'And get me a downtime report at end of shift — total hours lost by line for this month. I need it for the executive committee.'],
            ['OPS',   'I\'ll have it on your desk by 18:00.'],
        ];
    }

    private function ownerHrThread(): array
    {
        return [
            ['HR',    'Hello Sami. I wanted to follow up on the two technician positions we posted last month. We\'ve received 34 applications. I\'ve shortlisted 8 candidates for technical assessment.'],
            ['OWNER', 'That\'s good progress. What profile are we looking for again — electrical or mechanical?'],
            ['HR',    'One electrical (PLC & automation focus) and one mechanical (rotating equipment). Both require at least 3 years of industrial maintenance experience.'],
            ['OWNER', 'Has Khalil reviewed the shortlists? He should have input on the technical requirements.'],
            ['HR',    'I\'ve sent him the CVs yesterday. He confirmed 5 of the 8 candidates meet the technical criteria. He also suggested adding a hands-on practical test at Site A during the interview.'],
            ['OWNER', 'Great idea. When do you plan to schedule interviews?'],
            ['HR',    'I\'m proposing next week Tuesday and Wednesday. I\'ll coordinate with Khalil for the practical session.'],
            ['OWNER', 'Works for me. Please make sure the onboarding plan is ready before they start — CMMS access, site induction, PPE. Last time we had two weeks of delays getting a new hire operational.'],
            ['HR',    'I\'ve already drafted a new onboarding checklist specifically for technical staff. It includes CMMS orientation, safety induction, site tour, and a 30-day mentoring plan paired with a senior technician.'],
            ['OWNER', 'Excellent. Share that checklist with me so I can review it before we finalize.'],
            ['HR',    'Sending it over now. Also — quick note on the annual performance reviews. I need managers to submit their team evaluations by end of this month. Can you remind Khalil and Rami?'],
            ['OWNER', 'I\'ll mention it in our next management meeting. Thanks for the update Hanen.'],
        ];
    }

    private function ownerTech1Thread(): array
    {
        return [
            ['TECH1', 'Good morning. Just wanted to report — the hydraulic press HP-002 at Station 4 is making an unusual noise since this morning. It sounds like cavitation in the pump.'],
            ['OWNER', 'Thanks for flagging this immediately. Have you stopped the machine?'],
            ['TECH1', 'Yes sir, I isolated it and put up a LOTO lockout. I\'ve already opened a WO in the CMMS with photos and a description of the symptoms.'],
            ['OWNER', 'Good work. What\'s your assessment of the cause?'],
            ['TECH1', 'I checked the hydraulic fluid level — it was low. The tank also shows some contamination, looks like water ingress. I suspect the cooler gasket is leaking.'],
            ['OWNER', 'Do we have the replacement gasket in stock?'],
            ['TECH1', 'I checked the CMMS inventory — there are 2 units in stock. I\'ve requested them through the system.'],
            ['OWNER', 'Excellent. How long do you estimate for the repair?'],
            ['TECH1', 'If I get the parts within the hour, I can have it back online by early afternoon. I\'ll also flush and replace the hydraulic fluid completely.'],
            ['OWNER', 'Do it. Keep me posted. And make sure you document all the steps in the WO — this machine has been problematic and I want a full history for the reliability review.'],
            ['TECH1', 'Understood. I\'ll photograph everything and log all actions in the CMMS before closing the WO.'],
            ['OWNER', 'Good job catching this early. That kind of proactive reporting saves us a lot of money.'],
        ];
    }

    private function ownerLeilaThread(): array
    {
        return [
            ['LEILA', 'Good afternoon Sami. I wanted to share the results from our first thermography scan of the electrical panels.'],
            ['OWNER', 'Go ahead Leila. How did it look?'],
            ['LEILA', 'We found 3 hotspots. One at the main distribution panel on Site A — temperature differential of 28°C above ambient. That\'s a serious concern and we\'ve flagged it as critical.'],
            ['OWNER', 'That sounds dangerous. What\'s the action plan?'],
            ['LEILA', 'I\'ve already raised a critical WO in the CMMS. The recommendation is to take the panel offline during the weekend for a full inspection and terminal tightening. We also suspect a failing breaker.'],
            ['OWNER', 'Coordinate that with Rami in operations. We need to plan the production impact. Is the qualified electrician available this weekend?'],
            ['LEILA', 'I\'ve already checked — Fatma is available Saturday morning. We can have it resolved by noon.'],
            ['OWNER', 'Good. What about the other two hotspots?'],
            ['LEILA', 'Both are on motor starter panels in the pump room. Differential of around 15°C — still within warning range. We\'ll schedule corrective PM for those within the next two weeks.'],
            ['OWNER', 'Great work Leila. This is exactly what the predictive maintenance program is for. Can you put together a one-page summary of the findings for the board report?'],
            ['LEILA', 'Of course. I\'ll have it ready by tomorrow morning with photos and the thermal images attached.'],
            ['OWNER', 'Perfect. And start planning the next round — I want vibration analysis on all rotating equipment in the pump room within the month.'],
            ['LEILA', 'Already on the schedule. We start next Tuesday.'],
        ];
    }

    private function ownerAhmedThread(): array
    {
        return [
            ['AHMED', 'Sami, the rooftop AHU unit on Building B has stopped working. The compressor is not starting. It\'s 38 degrees outside and the admin floor is getting very hot.'],
            ['OWNER', 'Ahmed, check it immediately. Is it a power issue or a mechanical failure?'],
            ['AHMED', 'I\'m on the roof now. The compressor trips on overload. The capacitor looks burnt — I can smell it. I think it\'s a failed start capacitor.'],
            ['OWNER', 'Do we have that capacitor in stock?'],
            ['AHMED', 'I checked on the app — we don\'t have the exact specification. The one in stock is a different rating.'],
            ['OWNER', 'Contact the HVAC supplier immediately and get it today. If they can\'t deliver, send someone to pick it up directly. This cannot wait.'],
            ['AHMED', 'I\'m calling them now. In the meantime I can set up portable fans for the admin floor. I\'ll also check if we can temporarily reroute cooling from the adjacent zone.'],
            ['OWNER', 'Do both. I\'ll notify HR to let the admin staff know. Keep me posted every hour on this one.'],
            ['AHMED', 'Update: Supplier confirmed they have it in stock. I\'m sending Mohamed to pick it up now — he\'ll be back within 45 minutes.'],
            ['OWNER', 'Good. Get it done today. Open a WO in the CMMS and add the part cost to the procurement record.'],
            ['AHMED', 'WO is already open — AHU-2024-031. I\'ll close it with full documentation once the repair is complete.'],
            ['OWNER', 'Thanks Ahmed. Good work handling this fast.'],
        ];
    }

    private function ownerKarimThread(): array
    {
        return [
            ['KARIM', 'Good evening. Night shift starting. I wanted to flag that the cooling tower fan motor on CT-01 has been vibrating more than usual since 20:00. I\'ve logged it in the CMMS.'],
            ['OWNER', 'Thanks Karim. Is it safe to continue operating?'],
            ['KARIM', 'For now yes. I\'ve reduced the fan speed by 10% to reduce load and set up hourly checks. If the vibration increases further I\'ll shut it down.'],
            ['OWNER', 'Good call. Alert Leila first thing in the morning — she needs to run a vibration analysis on it before the day shift starts.'],
            ['KARIM', 'Will do. I\'ll leave a detailed handover note in the WO and send her a message at 6am.'],
            ['OWNER', 'Any other issues tonight?'],
            ['KARIM', 'The compressed air pressure on Line 3 dropped briefly around 21:30 — recovered on its own after about 2 minutes. Could be a demand spike or a small leak. I\'ll do a full compressed air inspection during the quiet period at 2am.'],
            ['OWNER', 'Log everything. If you find a leak, tag it and create a WO — don\'t try to repair it during the night shift without a supervisor.'],
            ['KARIM', 'Understood. Everything else is running normally. I\'ll send the night shift report by 6am as usual.'],
            ['OWNER', 'Thanks Karim. Stay safe tonight.'],
        ];
    }

    private function ownerSoniaThread(): array
    {
        return [
            ['SONIA', 'Good afternoon Sami. I\'ve completed the internal safety audit for Site A. The full report is uploaded to the file manager. Summary: 12 observations, 3 of which are non-conformities that need immediate attention.'],
            ['OWNER', 'Thanks Sonia. What are the 3 non-conformities?'],
            ['SONIA', '1. Missing LOTO procedures for 4 machines on Line 1. 2. Two fire extinguishers overdue for annual service by 6 weeks. 3. The emergency eyewash station in the chemical storage area is not functional.'],
            ['OWNER', 'Those are serious. What\'s the timeline to resolve?'],
            ['SONIA', 'LOTO procedures — I can print and laminate them by tomorrow, Khalil needs to validate the content first. Fire extinguishers — service company can come Thursday. Eyewash station — needs a plumber, likely a blocked pipe.'],
            ['OWNER', 'Get Rami to get a plumber on the eyewash immediately — that\'s a legal requirement. I want it resolved within 24 hours.'],
            ['SONIA', 'I\'ll contact Rami now. I\'ve also raised WOs in the CMMS for all three items so they\'re tracked.'],
            ['OWNER', 'Good. The ISO 45001 pre-audit is in two weeks. We need zero open non-conformities by then. Can you confirm all 12 observations have owners and deadlines in the system?'],
            ['SONIA', 'Yes — I assigned each one to the relevant team leader with a due date. I\'ll send you a status report every two days until the audit.'],
            ['OWNER', 'Perfect. Well done on the thoroughness of the audit Sonia.'],
        ];
    }

    // ── Group conversation scripts ──────────────────────────────────────────

    private function mgmtCommitteeThread(): array
    {
        return [
            ['OWNER', 'Good morning team. I\'m starting this group for our ongoing management discussions between board meetings. Let\'s keep it focused and professional.'],
            ['HR',    'Good morning everyone. Happy to have a dedicated channel for this.'],
            ['OPS',   'Makes sense. I\'ll post operational updates here instead of separate emails.'],
            ['MAINT', 'Same for maintenance. I\'ll share weekly KPI summaries here.'],
            ['OWNER', 'First topic: the Q3 maintenance costs came in 12% over budget. Khalil, what\'s driving that?'],
            ['MAINT', 'Two main factors: the emergency motor replacement on Line 1 (unplanned, 8,400 TND) and the hydraulic system overhaul on the press. Both assets were flagged in the risk register.'],
            ['OPS',   'Those two failures also cost us about 140 hours of production downtime. The real cost including lost production is much higher than the maintenance spend alone.'],
            ['OWNER', 'Exactly. Which is why the predictive maintenance investment is so critical. We need to accelerate that program.'],
            ['HR',    'On headcount — I\'m in the middle of recruiting two additional technicians. Expected on board within 6 weeks, which will also reduce overtime costs.'],
            ['MAINT', 'That will help a lot. The current team is stretched on night shifts.'],
            ['OWNER', 'Hanen — for the new hires, make sure their contracts include the site-specific certifications we require. No more than 2 weeks onboarding before they\'re productive.'],
            ['HR',    'Understood. The onboarding programme is already redesigned. 2 weeks including CMMS training, safety induction and hands-on mentoring.'],
            ['OPS',   'Quick update — the new conveyor spare parts have arrived and are in stock. Maintenance will do the preventive replacement during the planned shutdown next week.'],
            ['MAINT', 'Confirmed. Team is ready. We\'ve already prepared the work instructions in the CMMS.'],
            ['OWNER', 'Good. One last item — the external auditors visit is in two weeks for ISO 45001. I expect everyone to review the non-conformity list and ensure your teams are prepared.'],
            ['HR',    'HR is clear — no open items on our side.'],
            ['OPS',   'I\'ll make sure the operational teams have reviewed the safety procedures by end of this week.'],
            ['MAINT', 'Same for maintenance. LOTO documentation is being updated as we speak.'],
            ['OWNER', 'Thank you all. Let\'s reconvene here after the shutdown next week with a status update.'],
        ];
    }

    private function emergencyBoilerThread(): array
    {
        return [
            ['OWNER', 'EMERGENCY GROUP — Boiler Line 2. I\'ve just been informed the boiler tripped at 06:15. This group is for real-time coordination. What is the current status?'],
            ['MAINT', 'I\'m on my way to the plant now. Karim and his night shift team are already on site. Initial assessment incoming.'],
            ['KARIM', 'On site. Boiler tripped on high temperature fault. Pressure at 0, safely vented. No visible damage. I\'ve isolated gas and steam valves and put up barriers.'],
            ['OPS',   'Line 2 is completely down. I\'ve already stopped raw material feeding to avoid overflow. How long are we looking at?'],
            ['KARIM', 'Need at least 2 hours to cool down before we can open for inspection. Can\'t give a repair estimate until we see inside.'],
            ['MAINT', 'I\'m on site now. Karim, good work on the isolation. I\'m calling the boiler specialist — they\'re under our service contract. They can be here in 90 minutes.'],
            ['OWNER', 'Good. Rami — what\'s the production impact?'],
            ['OPS',   'Full shift loss on Line 2. I can partially compensate on Line 3 but we\'ll miss about 60% of today\'s target. I need to notify the commercial team for delivery scheduling.'],
            ['OWNER', 'Do it. Keep me updated every 30 minutes. Khalil — do we have all necessary spare parts on site or do we need to order?'],
            ['MAINT', 'The specialist will diagnose first. Based on the fault code, I suspect it\'s the high-temperature sensor or the burner control unit — both are in stock.'],
            ['TECH1', 'I\'m now with Khalil at the boiler. We can see some discoloration on the burner casing. Looks like it may have overheated. Photos uploaded to the WO.'],
            ['OWNER', 'Good documentation. Keep photos coming.'],
            ['MAINT', 'Specialist has arrived. Preliminary: faulty thermocouple caused a false high-temp reading — the burner shut down as a safety measure. Not a catastrophic failure. Replacing the thermocouple now.'],
            ['OWNER', 'Excellent news. ETA to restart?'],
            ['KARIM', 'Specialist estimates 45 minutes to replace and test. We should be back online by 10:30.'],
            ['OPS',   'I can recover about 40% of lost production if we run a 2-hour overtime shift this evening. Shall I proceed?'],
            ['OWNER', 'Yes, authorize the overtime. And let\'s schedule a root cause analysis session for tomorrow. I want to understand why that thermocouple failed.'],
            ['MAINT', 'Agreed. I\'ll set up the RCA in the CMMS and invite everyone in this group.'],
            ['KARIM', 'Boiler back online at 10:28. All parameters normal. Great teamwork everyone.'],
            ['OWNER', 'Well handled team. Thank you all for the fast response.'],
        ];
    }

    private function budgetPlanningThread(): array
    {
        return [
            ['OWNER', 'I\'m opening this group for Q4 and FY2025 CAPEX planning discussions. I need each department head to submit capital requirements by end of next week.'],
            ['MAINT', 'From maintenance: 1) Replace aging compressor on Line 1 (estimated 35,000 TND), 2) Portable vibration analyser for predictive team (12,000 TND), 3) CMMS server upgrade (8,000 TND).'],
            ['OPS',   'Operations is requesting the conveyor belt upgrade on Lines 2 and 3 — 8 failures this year. Estimated 28,000 TND. Also a new forklift for raw materials — 22,000 TND.'],
            ['HR',    'HR is requesting a training budget of 15,000 TND — safety certifications, CMMS training, and external technical courses for the technician team.'],
            ['OWNER', 'Total first pass is around 120,000 TND. That\'s above what I expected. I need everyone to prioritise and identify what is critical vs. nice to have.'],
            ['MAINT', 'The compressor is critical — 14 years old, 4 major repairs in 18 months. The vibration analyser pays for itself in avoided breakdowns within 18 months. CMMS upgrade can be deferred.'],
            ['OPS',   'The conveyor upgrade is critical — downtime cost this year alone exceeds the investment. The forklift can be deferred or we explore short-term rental for peak periods.'],
            ['HR',    'Safety certifications are mandatory and non-negotiable. CMMS training can be partly done in-house. I can bring the HR total down to 10,000 TND.'],
            ['OWNER', 'Good. Let\'s prioritise: compressor replacement, conveyor upgrade, safety training, and vibration analyser. That gets us to approximately 90,000 TND. I\'ll present this to the board next week.'],
            ['MAINT', 'Agreed. I\'ll prepare the ROI justification document for the compressor and vibration analyser.'],
            ['OPS',   'I\'ll pull together the downtime cost report for the conveyor investment case.'],
            ['OWNER', 'Thank you all. Please send me your final one-page investment briefs by Thursday noon.'],
        ];
    }

    private function predictiveMaintenanceThread(): array
    {
        return [
            ['OWNER', 'I\'m creating this group to track our predictive maintenance program. Leila is leading it with support from Karim and Sonia. I want monthly updates here.'],
            ['LEILA', 'Thank you Sami. I\'ve prepared a 3-month roadmap. Month 1: Baseline data collection — vibration, thermography, oil analysis. Month 2: Establish normal operating ranges. Month 3: First anomaly detection and reporting.'],
            ['KARIM', 'From the night shift side, I can run vibration spot checks on rotating equipment during low-production windows — less interference with operations.'],
            ['SONIA', 'I\'ll coordinate the thermography sessions. We need the electrical panels de-loaded slightly for accurate thermal readings — I\'ll work with operations for scheduling.'],
            ['MAINT', 'I want to make sure findings feed directly into corrective PMs in the CMMS. Leila, can you set up a workflow where anomalies automatically generate draft WOs for my review?'],
            ['LEILA', 'Absolutely. I\'ll create a tag category in the CMMS for "predictive finding" — any WO I create from an anomaly will carry that tag so we can track the programme ROI.'],
            ['OWNER', 'Excellent thinking. That will let us demonstrate the programme\'s value in financial terms — every avoided breakdown has a cost avoidance value.'],
            ['LEILA', 'First results are in from the vibration analysis round. Motor M-012 shows early-stage imbalance — 4.2 mm/s vibration vs. our 3.5 mm/s threshold. I\'ve raised a PM WO to balance the motor before it fails.'],
            ['KARIM', 'Good catch. That motor runs 24/7. An unplanned failure there would have been a minimum 6-hour shutdown.'],
            ['MAINT', 'I\'ve reviewed the WO — approved and scheduled for Saturday. This is exactly the result we needed from this programme.'],
            ['OWNER', 'Excellent. This goes in the board report. Leila, prepare a short summary: what we found, what the failure would have cost, what the intervention costs.'],
            ['LEILA', 'I\'ll have it ready by Friday. I\'ll also include the thermography results — three hotspots identified, one critical, already being resolved.'],
            ['SONIA', 'The critical panel hotspot was repaired yesterday. Fatma confirmed it was a loose connection causing arcing. Fixed in 3 hours with zero unplanned downtime.'],
            ['OWNER', 'Outstanding. I\'m very pleased with how this programme is starting. Keep the momentum going team.'],
        ];
    }

    private function safetyAuditThread(): array
    {
        return [
            ['OPS',   'Sami has asked me to lead the ISO 45001 audit preparation. I\'m adding Sonia, Fatma and Amira to this group as they\'re responsible for the key areas.'],
            ['SONIA', 'Thanks Rami. I\'ve completed the internal audit — report is in the file manager under Safety > Audits. Summary: 12 observations, 3 non-conformities. All have been assigned in the CMMS.'],
            ['FATMA', 'I\'ve reviewed the electrical safety section. The main gap is the missing arc flash risk assessments for 6 panels. I\'ve drafted the procedure — need Sami\'s approval before we print and post them.'],
            ['OWNER', 'I\'ll review it today Fatma. Send me the draft directly.'],
            ['AMIRA', 'For the LOTO section, I\'ve verified that 14 out of 18 procedures are complete and posted. The remaining 4 machines on Line 1 are being done by Khalil\'s team by tomorrow.'],
            ['SONIA', 'The eyewash station is now operational — plumber fixed the blockage this morning. I\'ve updated the corrective action in the CMMS and taken the verification photo.'],
            ['OPS',   'Good progress. What about the fire extinguisher service — that was one of the non-conformities?'],
            ['SONIA', 'Service company came Thursday. All 22 extinguishers inspected, 3 replaced. Certificates are uploaded to the file manager.'],
            ['FATMA', 'I\'ve also updated the emergency contact list — the old version was 18 months out of date. New version posted at all emergency stations.'],
            ['OWNER', 'Excellent work everyone. Where do we stand on the chemical storage register? That was flagged in last year\'s audit.'],
            ['AMIRA', 'The SDS register is complete — 47 chemicals catalogued, all SDS sheets uploaded. We also added QR codes at each storage location linking to the digital SDS.'],
            ['OPS',   'That\'s impressive. I think we\'re in very good shape for the audit. Sonia — can you do a final walkthrough on Monday and confirm everything is in order?'],
            ['SONIA', 'Already planned. I\'ll do the walkthrough Monday morning and send a final readiness checklist by noon.'],
            ['OWNER', 'Thank you all. I\'m confident we\'ll pass this audit. The work you\'ve done here is well above the minimum standard.'],
        ];
    }

    private function onboardingThread(): array
    {
        return [
            ['HR',     'Welcome to the team Yassine and Mohamed! This group includes your direct manager Khalil and the company owner Sami. We\'ll use this to coordinate your first two weeks.'],
            ['YASSINE','Thank you! Very happy to be joining. Ready to get started.'],
            ['MOHAMED','Thank you for the welcome. Looking forward to contributing to the team.'],
            ['MAINT',  'Welcome both of you. I\'ve prepared your first week schedule. Day 1: site induction and safety briefing. Day 2: CMMS training with me. Days 3-5: shadowing a senior technician on live WOs.'],
            ['OWNER',  'Welcome Yassine and Mohamed. We\'re glad to have you on board. Don\'t hesitate to ask questions — there are no bad questions in your first month.'],
            ['HR',     'Your CMMS accounts have been created. You\'ll receive login details by email this morning. Please log in and complete your profile today.'],
            ['YASSINE','I\'m logged in. The system looks very complete. I can already see my team assignments and the open WOs.'],
            ['MOHAMED','Same here. I can see the Site B work orders. A few are already assigned to me — should I start picking those up?'],
            ['MAINT',  'Not yet Mohamed — spend the first week observing and learning the processes. You\'ll start taking independent WOs in week 2 after I\'ve confirmed you\'re comfortable with the procedures.'],
            ['HR',     'Your PPE kits are ready at the reception desk. Please collect them before you go to site today. Helmets, boots, gloves and safety glasses are included.'],
            ['YASSINE','Collected — thank you. The safety induction this morning was very thorough.'],
            ['MAINT',  'Yassine — you\'ll be mentored by Karim Trabelsi on the mechanical side. Mohamed — Ahmed Ben Salah will be your mentor for HVAC and utilities.'],
            ['OWNER',  'I\'ll stop by the workshop this afternoon to say hello properly. Looking forward to meeting you both in person.'],
        ];
    }

    private function nightShiftThread(): array
    {
        return [
            ['KARIM',  'Night shift team — this group is for overnight coordination. Yassine covers Line 1 and 2, Mohamed covers utilities and HVAC. I\'m overall supervisor. Any issues, log in CMMS and message here immediately.'],
            ['YASSINE','Understood. Starting my walkthrough now.'],
            ['MOHAMED','On site. HVAC systems all showing green. Starting the cooling tower checks.'],
            ['KARIM',  'Good. Tonight is a quiet production night — only Line 1 running at 60% for the test batch. Main priority is the PM tasks I\'ve assigned in the CMMS for the compressor room.'],
            ['MAINT',  'Karim — I\'ve added 2 additional PM tasks to tonight\'s list. Check the CMMS — both are low priority but it\'s a good window to do them while production is light.'],
            ['KARIM',  'Seen — will assign to Yassine during the 2am quiet period.'],
            ['YASSINE','Quick update: found a small oil leak on compressor C-02 discharge line. Nothing urgent but I\'ve tagged it and created a WO. Photos uploaded.'],
            ['KARIM',  'Good catch Yassine. Monitor the oil level through the shift and log it every 2 hours. I\'ll flag for the day shift to do the repair.'],
            ['OWNER',  'I\'m up early — saw the notification on the WO. Good work Yassine. Karim, please include this in the shift handover report.'],
            ['KARIM',  'Will do Sami. Handover report will be in the CMMS by 5:45am as usual.'],
            ['MOHAMED','Cooling tower fan CT-01 vibration has increased slightly in the last hour. Matching the observation from last night. I\'ve updated the WO.'],
            ['KARIM',  'I\'ll reduce fan speed to 70% as a precaution. Leila\'s team will run the vibration analysis first thing in the morning. Flag me if it gets worse.'],
            ['YASSINE','All PM tasks completed. Line 1 running smoothly. Compressor oil level stable — no further leakage observed.'],
            ['KARIM',  'Good night everyone. Shift ending at 06:00. Day team taking over. Shift report submitted. Stay safe and good work tonight.'],
            ['OWNER',  'Well done team. This is exactly the standard of professionalism I expect. Thank you.'],
        ];
    }
}
