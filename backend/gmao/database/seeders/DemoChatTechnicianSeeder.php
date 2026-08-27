<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Adds chat conversations that directly involve the technician (TECH1).
 * Safe to re-run: direct conversations are skipped if they already exist,
 * groups are skipped if a group with the same name already exists.
 */
class DemoChatTechnicianSeeder extends Seeder
{
    private int   $companyId;
    private array $m = [];

    public function run(): void
    {
        $company = DB::table('companies')->where('name', 'Demo Company')->first()
            ?? DB::table('companies')->where('approval_status', 'approved')->orderBy('id')->first()
            ?? DB::table('companies')->orderBy('id')->first();

        if (! $company) {
            $this->command->warn('No company found.');
            return;
        }
        $this->companyId = $company->id;
        $this->command->info("Company: {$company->name} (ID: {$this->companyId})");

        $this->m = $this->resolveMembers();

        $missing = array_filter($this->m, fn ($id) => $id === null);
        if (! empty($missing)) {
            $this->command->warn('Missing slots: ' . implode(', ', array_keys($missing)));
        }

        // ── Direct: Manager → Technician ──────────────────────────────────────
        $this->direct('MAINT', 'TECH1',
            Carbon::now()->setTime(7, 0),
            $this->maintToTechThread());

        // ── Direct: Karim (Senior Tech) → Technician ──────────────────────────
        $this->direct('KARIM', 'TECH1',
            Carbon::now()->subDays(1)->setTime(21, 45),
            $this->karimToTechThread());

        // ── Direct: Ahmed (Colleague) → Technician ────────────────────────────
        $this->direct('AHMED', 'TECH1',
            Carbon::now()->subDays(2)->setTime(10, 0),
            $this->ahmedToTechThread());

        // ── Direct: HR → Technician ───────────────────────────────────────────
        $this->direct('HR', 'TECH1',
            Carbon::now()->subDays(3)->setTime(14, 30),
            $this->hrToTechThread());

        // ── Direct: Owner → Technician (extra praise / follow-up) ────────────
        $this->direct('OWNER', 'TECH1',
            Carbon::now()->subHours(4),
            $this->ownerTechFollowUp());

        // ── Group: Field Technicians ──────────────────────────────────────────
        $this->group(
            'Field Technicians',
            null,
            'MAINT',
            ['MAINT', 'TECH1', 'KARIM', 'AHMED', 'YASSINE', 'MOHAMED'],
            Carbon::now()->subDays(5)->setTime(8, 0),
            $this->fieldTechsThread());

        // ── Group: Shift Handover — Day Team ─────────────────────────────────
        $this->group(
            'Shift Handover — Day Team',
            null,
            'KARIM',
            ['KARIM', 'TECH1', 'YASSINE', 'MAINT'],
            Carbon::now()->subHours(7),
            $this->shiftHandoverThread());

        $this->command->info('✓ DemoChatTechnicianSeeder completed.');
    }

    // ── Member resolution ──────────────────────────────────────────────────────

    private function resolveMembers(): array
    {
        $cid = $this->companyId;

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

        $this->command->info("Found {$members->count()} members.");

        $admins  = $members->filter(fn ($m) => in_array('admin',      $m['role_code']))->values();
        $managers= $members->filter(fn ($m) => in_array('manager',    $m['role_code']))->values();
        $techs   = $members->filter(fn ($m) => in_array('technician', $m['role_code']))->values();
        $all     = $members->values();

        $pick     = fn (int $i)         => $all->get($i)['id']      ?? null;
        $pickFrom = fn ($col, int $i)   => $col->get($i)['id']      ?? null;

        return [
            'OWNER'   => $pickFrom($admins,   0),
            'HR'      => $pickFrom($managers, 0) ?? $pickFrom($admins, 1),
            'OPS'     => $pickFrom($managers, 1) ?? $pickFrom($admins, 2),
            'TECH1'   => $pickFrom($techs,    0),
            'MAINT'   => $pickFrom($managers, 2) ?? $pickFrom($admins, 3),
            'KARIM'   => $pickFrom($techs,    4) ?? $pick(8),
            'AHMED'   => $pickFrom($techs,    2) ?? $pick(6),
            'YASSINE' => $pickFrom($techs,    6) ?? $pick(10),
            'MOHAMED' => $pickFrom($techs,    8) ?? $pick(12),
        ];
    }

    private function id(string $key): ?int
    {
        return $this->m[$key] ?? null;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function direct(string $keyA, string $keyB, Carbon $baseTime, array $messages): void
    {
        $a = $this->id($keyA);
        $b = $this->id($keyB);
        if (! $a || ! $b) {
            $this->command->warn("Skipping direct {$keyA}↔{$keyB}: member not found.");
            return;
        }

        $aConvs = DB::table('conversation_members')->where('member_id', $a)->pluck('conversation_id')->toArray();
        $bConvs = DB::table('conversation_members')->where('member_id', $b)->pluck('conversation_id')->toArray();
        $shared = array_intersect($aConvs, $bConvs);
        if (! empty($shared)) {
            $exists = DB::table('conversations')
                ->whereIn('id', $shared)
                ->where('company_id', $this->companyId)
                ->where('type', 'direct')
                ->exists();
            if ($exists) {
                $this->command->warn("  Skipping direct {$keyA}↔{$keyB}: already exists.");
                return;
            }
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
            DB::table('conversation_members')->insertOrIgnore([
                'conversation_id' => $convId,
                'member_id'       => $mid,
                'last_read_at'    => null,
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

        if (DB::table('conversations')->where('company_id', $this->companyId)->where('name', $name)->exists()) {
            $this->command->warn("  Skipping group '{$name}': already exists.");
            return;
        }

        $memberIds = array_values(array_unique(array_filter(
            array_map(fn ($k) => $this->id($k), $memberKeys)
        )));
        if (count($memberIds) < 2) {
            $this->command->warn("Skipping group '{$name}': fewer than 2 members.");
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
            DB::table('conversation_members')->insertOrIgnore([
                'conversation_id' => $convId,
                'member_id'       => $mid,
                'last_read_at'    => null,
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

            $time->addMinutes(rand(2, 10));
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

    // ── Conversation scripts ───────────────────────────────────────────────────

    private function maintToTechThread(): array
    {
        return [
            ['MAINT', 'Good morning. I\'ve assigned you WO-0074 — conveyor belt alignment on Line 2. Priority is high. The belt has been slipping since last night.'],
            ['TECH1', 'Good morning Khalil. Got it — I can see it in the CMMS. I\'ll head there first thing after safety check.'],
            ['MAINT', 'The alignment tools are already in the workshop cabinet B2. You\'ll need the laser alignment kit. Check the belt tension on both ends before you start.'],
            ['TECH1', 'Understood. Should I also check the drive pulley condition while I\'m there? Last week I noticed some surface wear.'],
            ['MAINT', 'Yes — inspect it and document the wear measurement in the WO notes. If it\'s more than 2mm wear depth, flag it for replacement and I\'ll raise a parts request.'],
            ['TECH1', 'OK. One question — the motor coupling on that conveyor was making noise last shift. Should I check that too or create a separate WO?'],
            ['MAINT', 'Check it. If you find an issue, add it to the same WO as an additional finding — no need to create a separate one for now unless it\'s a different root cause.'],
            ['TECH1', 'Perfect. I\'m on my way now. I\'ll update the WO status when I start.'],
            ['MAINT', 'Good. I need a status update by 11:00 — operations is asking about the restart time for Line 2.'],
            ['TECH1', 'I\'ll send you a message as soon as the alignment is complete and I\'ve run a test cycle. Should be done well before 11.'],
            ['MAINT', 'Excellent. Good work on catching the coupling noise — that\'s the kind of proactive observation I want from the team.'],
        ];
    }

    private function karimToTechThread(): array
    {
        return [
            ['KARIM', 'Hey — handing over from night shift. The compressor oil leak I found on C-02 is tagged as WO-0081. Oil level stable all night — no worsening. But day team needs to do the repair today.'],
            ['TECH1', 'Got it Karim. I saw the WO notification. What\'s the location exactly — discharge line near the cooler?'],
            ['KARIM', 'Yes, exactly. It\'s the compression fitting on the discharge line, about 30cm upstream from the oil cooler inlet. I\'ve put a drip tray under it and marked it with yellow tape.'],
            ['TECH1', 'Do we have the fitting in stock?'],
            ['KARIM', 'I checked — we have two of the 1/2 inch BSP fittings in the spare parts cabinet. Should be enough. You\'ll also need some PTFE thread tape.'],
            ['TECH1', 'Perfect. I\'ll get to it after I finish the conveyor alignment job. Probably around 10:30.'],
            ['KARIM', 'One more thing — the cooling tower fan CT-01 vibration is still elevated. Leila\'s team should be running a vibration analysis this morning. Keep an eye on it and don\'t restart at full speed until you get the green light.'],
            ['TECH1', 'OK, I\'ve noted that. I\'ll check with Leila\'s team when I see them. Anything else from last night?'],
            ['KARIM', 'All clear otherwise. Line 1 ran smoothly. Full shift report is in the CMMS. Good luck today.'],
            ['TECH1', 'Thanks Karim. Get some rest.'],
        ];
    }

    private function ahmedToTechThread(): array
    {
        return [
            ['AHMED', 'Hey, can you do me a favour? I have the safety induction training all morning tomorrow and I have PM checks scheduled on the cooling tower CT-02. Is there any chance you can cover those for me?'],
            ['TECH1', 'Sure, no problem. What does the CT-02 PM include exactly?'],
            ['AHMED', 'It\'s the monthly check — visual inspection of fan blades, belt tension, basin water level and float valve, plus checking the drift eliminators. Should take about 40 minutes. All the steps are in the CMMS PM task.'],
            ['TECH1', 'I can do that. What time should I start?'],
            ['AHMED', 'The PM is scheduled for 9am but you can push it to 10 if you have something earlier. Just needs to be done before the ops team runs the cooling tower test at 14:00.'],
            ['TECH1', 'I\'ll fit it in at 9am. I\'ll document everything in the CMMS under your PM task or should I log it under my name?'],
            ['AHMED', 'Log it under your name — just add a note that you covered for me. Khalil knows about it.'],
            ['TECH1', 'Done. I\'ll also photograph the basin level and belt condition so we have a visual record.'],
            ['AHMED', 'Brilliant — thanks a lot. I owe you one. By the way, the belt tension gauge is in the HVAC tool kit in the green cabinet, not the general toolbox.'],
            ['TECH1', 'Good to know, I was going to grab the wrong one. All good — good luck with the training tomorrow.'],
            ['AHMED', 'Thanks! I\'ll check the results when I get back.'],
        ];
    }

    private function hrToTechThread(): array
    {
        return [
            ['HR',    'Good afternoon. I wanted to confirm your registration for the Electrical Safety & LOTO Certification training. It\'s scheduled for next Thursday, 8:00–17:00 at the main conference room.'],
            ['TECH1', 'Thanks for confirming. Is this the full-day course or just the morning?'],
            ['HR',    'Full day. Lunch is provided. Please bring your ID badge and wear appropriate PPE — the afternoon session includes a practical LOTO demonstration on real equipment.'],
            ['TECH1', 'Understood. Do I need to prepare anything in advance or bring any documents?'],
            ['HR',    'Just your last training certificate if you have one — for the instructor\'s records. No preparation needed otherwise.'],
            ['TECH1', 'I have my previous safety certificate from 18 months ago. I\'ll bring that.'],
            ['HR',    'Perfect. Also — I wanted to let you know that upon completion of this certification, your skill profile in the CMMS will be updated and it will unlock you for electrical work orders.'],
            ['TECH1', 'That\'s great news. I\'ve been wanting to expand to electrical tasks. Will I be able to take on panel inspections after?'],
            ['HR',    'Yes, in combination with Fatma\'s supervision initially. Khalil will assign you a mentored period for the first 3 electrical WOs before you can work independently.'],
            ['TECH1', 'That makes sense. I\'m looking forward to it. Thank you Hanen.'],
            ['HR',    'Of course. Any questions closer to the date, feel free to message me. Have a good rest of your day.'],
        ];
    }

    private function ownerTechFollowUp(): array
    {
        return [
            ['OWNER', 'I saw the update on WO-0074 — the conveyor alignment and coupling check. Good documentation. I can see you also caught the wear on the drive pulley.'],
            ['TECH1', 'Yes — measured 2.3mm wear depth on the drive pulley. I flagged it in the WO notes as you can see. Khalil is raising a parts request.'],
            ['OWNER', 'Good catch. That level of wear would have caused another failure within the month. How long did the full repair take?'],
            ['TECH1', 'About 2.5 hours including the coupling check and the test run. Line 2 is back at full capacity since 10:45.'],
            ['OWNER', 'Excellent. Operations confirmed production resumed on schedule. Well done.'],
            ['TECH1', 'Thank you. I also noticed the guarding on the belt drive side has a loose bolt — I tightened it and noted it in the WO as a secondary finding.'],
            ['OWNER', 'That\'s exactly the attitude I want to see. You\'re not just fixing the assigned issue — you\'re thinking about the whole system. Keep that up.'],
            ['TECH1', 'Thank you Sami. I\'ll head to the compressor room now to handle the oil leak on C-02.'],
            ['OWNER', 'Good. If you need anything — parts, support, anything — don\'t hesitate to escalate. I want that repaired today.'],
            ['TECH1', 'Understood. I\'ll update the WO status as I progress.'],
        ];
    }

    private function fieldTechsThread(): array
    {
        return [
            ['MAINT',   'I\'m creating this group for all field technicians. Use this for quick coordination during the day — finding tools, covering tasks, asking questions. Keep it professional.'],
            ['TECH1',   'Thanks Khalil. Good to have a dedicated channel.'],
            ['KARIM',   'Makes sense. Night shift will use this too for handovers and alerts.'],
            ['AHMED',   'Good idea. I\'ll post HVAC-specific alerts here when something comes up.'],
            ['YASSINE', 'Ready. Still learning the systems but will contribute where I can.'],
            ['MAINT',   'Quick update for everyone — the spare parts cabinet B2 has been reorganised. Bearings are now in the top shelf, hydraulic fittings in the middle, electrical components at the bottom. Labels updated.'],
            ['TECH1',   'Good to know — I spent 10 minutes looking for a fitting yesterday. Will check the new layout.'],
            ['KARIM',   'Also — the laser alignment kit needs calibration. I left a note on it. Don\'t use it for critical alignments until it\'s been verified.'],
            ['TECH1',   'I used it this morning actually — results seemed consistent with the reference marks but I\'ll re-verify.'],
            ['AHMED',   'Let me check calibration requirements and get back to you. I know a bit about the Fluke kit.'],
            ['MAINT',   'URGENT: anyone near the pump room? There\'s a pressure alarm on PP-004. Who can respond?'],
            ['TECH1',   'I\'m 3 minutes away. Heading there now.'],
            ['KARIM',   'I\'m closer — already moving. Will report back.'],
            ['KARIM',   'False alarm — pressure transducer display issue. Actual pressure is normal. I\'ve logged a fault on the sensor in the CMMS.'],
            ['MAINT',   'Good, thank you both for the fast response. That\'s exactly what I need from this team.'],
            ['YASSINE', 'Quick question — on WO-0077 for the gearbox on Line 3, the oil drain plug is seized. What\'s the best approach without damaging the threads?'],
            ['KARIM',   'Apply penetrating oil and wait 20 minutes. If it still won\'t budge, use an impact wrench on the lowest torque setting. Don\'t force it cold.'],
            ['TECH1',   'Agree with Karim. Also make sure the gearbox is cold before you try — thermal contraction helps loosen seized plugs.'],
            ['YASSINE', 'That worked — plug came out after the penetrating oil. Thanks.'],
            ['AHMED',   'Reminder: the cooling tower fan CT-01 is still at reduced speed per Karim\'s note. Leila\'s team confirmed the vibration analysis is done — report pending. Don\'t restart at full speed until we get clearance.'],
            ['MAINT',   'Confirmed — I\'ll post here as soon as I get Leila\'s report. Expect it this afternoon.'],
            ['KARIM',   'Leila just sent me the report — imbalance confirmed on the fan blade. She recommends rebalancing before running full speed. I\'ve created the WO.'],
            ['TECH1',   'I can do the rebalancing tomorrow morning if no one else is assigned.'],
            ['MAINT',   'I\'ll assign it to you now. Check the WO — it\'s WO-0083. Make sure you have the portable balancer from the metrology room.'],
        ];
    }

    private function shiftHandoverThread(): array
    {
        return [
            ['KARIM',  'Day team — handing over. Full shift report is in the CMMS. Key open items below.'],
            ['KARIM',  '1. WO-0081 (C-02 oil leak) — parts are ready in cabinet B2, repair scheduled for today. 2. CT-01 fan at 70% — do not increase until rebalancing is complete (WO-0083). 3. Line 1 PM tasks from last night — all completed and closed.'],
            ['TECH1',  'Received and understood. I\'ve read the CMMS shift report. I\'ll tackle the C-02 oil leak first after the conveyor job.'],
            ['YASSINE','Got it. I\'ll monitor CT-01 and update the WO if vibration changes.'],
            ['MAINT',  'Thanks Karim. Good night shift. Day team — let\'s clear those two open items before 16:00. Line 2 is back up so let\'s focus on compressor room and the cooling tower prep.'],
            ['TECH1',  'Understood. Starting C-02 repair now — parts confirmed in cabinet. Will update in 45 minutes.'],
            ['TECH1',  'Update: C-02 oil leak repaired. Replaced the compression fitting, applied PTFE, re-pressurised and checked for leaks — all clear. WO-0081 closed with photos.'],
            ['MAINT',  'Excellent. Fast work. That\'s one item cleared.'],
            ['YASSINE','Vibration on CT-01 stable at 70% speed. No change since morning. Fan rebalancing WO is scheduled for tomorrow morning.'],
            ['MAINT',  'Good. I\'ll confirm the WO assignment now. Day shift closing update: 2/2 priority items resolved or in progress. Good teamwork today.'],
        ];
    }
}
