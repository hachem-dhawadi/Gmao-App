<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoNotificationSeeder extends Seeder
{
    private int $companyId;
    private int $techUserId;
    private int $techMemberId;

    public function run(): void
    {
        // ── Resolve company ───────────────────────────────────────────────────
        $company = DB::table('companies')->where('name', 'Demo Company')->first()
            ?? DB::table('companies')->where('approval_status', 'approved')->orderBy('id')->first()
            ?? DB::table('companies')->orderBy('id')->first();

        if (! $company) {
            $this->command->warn('No company found.');
            return;
        }
        $this->companyId = $company->id;
        $this->command->info("Company: {$company->name} (ID: {$this->companyId})");

        // ── Resolve technician member ─────────────────────────────────────────
        $tech = $this->resolveTechnician();
        if (! $tech) {
            $this->command->warn('No technician member found.');
            return;
        }
        $this->techMemberId = $tech->member_id;
        $this->techUserId   = $tech->user_id;
        $this->command->info("Technician: {$tech->name} (user_id: {$this->techUserId})");

        // ── Resolve assets (for realistic data fields) ─────────────────────────
        $wos  = DB::table('work_orders')->where('company_id', $this->companyId)->limit(10)->get();
        $pms  = DB::table('pm_plans')->where('company_id', $this->companyId)->limit(5)->get();
        $items= DB::table('items')->where('company_id', $this->companyId)->limit(3)->get();

        $wo1  = $wos->get(0);
        $wo2  = $wos->get(1);
        $wo3  = $wos->get(2);
        $wo4  = $wos->get(3);
        $pm1  = $pms->get(0);
        $pm2  = $pms->get(1);
        $item1= $items->get(0);

        // ── Resolve a manager (sender name) ───────────────────────────────────
        $managerName = $this->resolveManagerName();

        // ── Delete existing notifications for this user (clean re-run) ────────
        DB::table('notifications')->where('user_id', $this->techUserId)->delete();
        $this->command->info("Cleared old notifications for user {$this->techUserId}.");

        // ── Insert notifications ───────────────────────────────────────────────
        $rows = [];

        // 1. wo_assigned — unread (just happened, 20 min ago)
        $rows[] = $this->notif('wo_assigned', [
            'title' => 'You were assigned to a work order',
            'body'  => "{$managerName} assigned you to \"" . ($wo1?->title ?? 'Conveyor Belt Alignment — Line 2') . "\" (" . ($wo1?->code ?? 'WO-0074') . ")",
            'data'  => ['wo_id' => $wo1?->id ?? 0, 'wo_code' => $wo1?->code ?? 'WO-0074', 'wo_title' => $wo1?->title ?? 'Conveyor Belt Alignment — Line 2'],
            'read'  => false,
            'at'    => Carbon::now()->subMinutes(20),
        ]);

        // 2. wo_due_soon — unread (WO due in 4 hours, notified 1 hour ago)
        $rows[] = $this->notif('wo_due_soon', [
            'title' => 'Work order due in 4h',
            'body'  => "Work order \"" . ($wo2?->title ?? 'Hydraulic Press HP-002 — Gasket Replacement') . "\" (" . ($wo2?->code ?? 'WO-0071') . ") is due in approximately 4 hours.",
            'data'  => ['wo_id' => $wo2?->id ?? 0, 'wo_code' => $wo2?->code ?? 'WO-0071', 'wo_title' => $wo2?->title ?? 'Hydraulic Press HP-002 — Gasket Replacement', 'hours_left' => 4],
            'read'  => false,
            'at'    => Carbon::now()->subHour(),
        ]);

        // 3. comment_mention — unread (mentioned 45 min ago)
        $rows[] = $this->notif('comment_mention', [
            'title' => 'You were mentioned in a comment',
            'body'  => "{$managerName} mentioned you in \"" . ($wo3?->title ?? 'Pump Room — Bearing Replacement') . "\" (" . ($wo3?->code ?? 'WO-0068') . ")",
            'data'  => ['wo_id' => $wo3?->id ?? 0, 'wo_code' => $wo3?->code ?? 'WO-0068', 'wo_title' => $wo3?->title ?? 'Pump Room — Bearing Replacement'],
            'read'  => false,
            'at'    => Carbon::now()->subMinutes(45),
        ]);

        // 4. pm_assigned — unread (this morning)
        $rows[] = $this->notif('pm_assigned', [
            'title' => 'You were assigned to a PM plan',
            'body'  => "{$managerName} assigned you to \"" . ($pm1?->name ?? 'Monthly Centrifugal Pump Inspection') . "\" (" . ($pm1?->code ?? 'PM-0012') . ")",
            'data'  => ['pm_id' => $pm1?->id ?? 0, 'pm_code' => $pm1?->code ?? 'PM-0012', 'pm_name' => $pm1?->name ?? 'Monthly Centrifugal Pump Inspection'],
            'read'  => false,
            'at'    => Carbon::now()->setTime(7, 30),
        ]);

        // 5. wo_status_changed — unread (2 hours ago, WO moved to in_progress)
        $rows[] = $this->notif('wo_status_changed', [
            'title' => 'Work order status updated',
            'body'  => "{$managerName} changed \"" . ($wo1?->title ?? 'Conveyor Belt Alignment — Line 2') . "\" (" . ($wo1?->code ?? 'WO-0074') . ") from open to in_progress",
            'data'  => ['wo_id' => $wo1?->id ?? 0, 'wo_code' => $wo1?->code ?? 'WO-0074', 'wo_title' => $wo1?->title ?? 'Conveyor Belt Alignment — Line 2', 'new_status' => 'in_progress'],
            'read'  => false,
            'at'    => Carbon::now()->subHours(2),
        ]);

        // 6. wo_pending_approval — unread (submitted for approval 3 hours ago)
        $rows[] = $this->notif('wo_pending_approval', [
            'title' => 'Work order awaiting your approval',
            'body'  => "{$managerName} submitted \"" . ($wo4?->title ?? 'AHU Compressor — Capacitor Replacement') . "\" (" . ($wo4?->code ?? 'WO-0069') . ") — please review and approve or reject.",
            'data'  => ['wo_id' => $wo4?->id ?? 0, 'wo_code' => $wo4?->code ?? 'WO-0069', 'wo_title' => $wo4?->title ?? 'AHU Compressor — Capacitor Replacement'],
            'read'  => false,
            'at'    => Carbon::now()->subHours(3),
        ]);

        // 7. wo_approved — read (approved yesterday)
        $rows[] = $this->notif('wo_approved', [
            'title' => 'Your work order was approved',
            'body'  => "{$managerName} approved \"" . ($wo3?->title ?? 'Pump Room — Bearing Replacement') . "\" (" . ($wo3?->code ?? 'WO-0068') . ") — it is now open.",
            'data'  => ['wo_id' => $wo3?->id ?? 0, 'wo_code' => $wo3?->code ?? 'WO-0068', 'wo_title' => $wo3?->title ?? 'Pump Room — Bearing Replacement'],
            'read'  => true,
            'at'    => Carbon::now()->subDay()->setTime(14, 15),
        ]);

        // 8. wo_overdue — read (seen yesterday)
        $rows[] = $this->notif('wo_overdue', [
            'title' => 'Work order overdue',
            'body'  => "Work order \"" . ($wo2?->title ?? 'Hydraulic Press HP-002 — Gasket Replacement') . "\" (" . ($wo2?->code ?? 'WO-0071') . ") is past its due date.",
            'data'  => ['wo_id' => $wo2?->id ?? 0, 'wo_code' => $wo2?->code ?? 'WO-0071', 'wo_title' => $wo2?->title ?? 'Hydraulic Press HP-002 — Gasket Replacement'],
            'read'  => true,
            'at'    => Carbon::now()->subDay()->setTime(8, 0),
        ]);

        // 9. pm_assigned — read (3 days ago, different PM)
        $rows[] = $this->notif('pm_assigned', [
            'title' => 'You were assigned to a PM plan',
            'body'  => "{$managerName} assigned you to \"" . ($pm2?->name ?? 'Quarterly HVAC Filter Replacement') . "\" (" . ($pm2?->code ?? 'PM-0019') . ")",
            'data'  => ['pm_id' => $pm2?->id ?? 0, 'pm_code' => $pm2?->code ?? 'PM-0019', 'pm_name' => $pm2?->name ?? 'Quarterly HVAC Filter Replacement'],
            'read'  => true,
            'at'    => Carbon::now()->subDays(3)->setTime(9, 45),
        ]);

        // 10. wo_assigned — read (1 week ago)
        $rows[] = $this->notif('wo_assigned', [
            'title' => 'You were assigned to a work order',
            'body'  => "{$managerName} assigned you to \"" . ($wo4?->title ?? 'AHU Compressor — Capacitor Replacement') . "\" (" . ($wo4?->code ?? 'WO-0069') . ")",
            'data'  => ['wo_id' => $wo4?->id ?? 0, 'wo_code' => $wo4?->code ?? 'WO-0069', 'wo_title' => $wo4?->title ?? 'AHU Compressor — Capacitor Replacement'],
            'read'  => true,
            'at'    => Carbon::now()->subWeek()->setTime(11, 0),
        ]);

        // 11. low_stock — unread (just appeared, for visibility in the app even though usually managers get this)
        $rows[] = $this->notif('low_stock', [
            'title' => "Low stock: " . ($item1?->name ?? 'Hydraulic Fluid ISO 46'),
            'body'  => "\"" . ($item1?->name ?? 'Hydraulic Fluid ISO 46') . "\" (" . ($item1?->code ?? 'ITEM-0031') . ") is at 2 L, at or below the minimum of 10 L.",
            'data'  => ['item_id' => $item1?->id ?? 0, 'item_name' => $item1?->name ?? 'Hydraulic Fluid ISO 46', 'item_code' => $item1?->code ?? 'ITEM-0031'],
            'read'  => false,
            'at'    => Carbon::now()->subMinutes(90),
        ]);

        // 12. comment_mention — read (2 days ago)
        $rows[] = $this->notif('comment_mention', [
            'title' => 'You were mentioned in a comment',
            'body'  => "{$managerName} mentioned you in \"" . ($wo1?->title ?? 'Conveyor Belt Alignment — Line 2') . "\" (" . ($wo1?->code ?? 'WO-0074') . ")",
            'data'  => ['wo_id' => $wo1?->id ?? 0, 'wo_code' => $wo1?->code ?? 'WO-0074', 'wo_title' => $wo1?->title ?? 'Conveyor Belt Alignment — Line 2'],
            'read'  => true,
            'at'    => Carbon::now()->subDays(2)->setTime(15, 30),
        ]);

        // 13. wo_rejected — read (4 days ago)
        $rows[] = $this->notif('wo_rejected', [
            'title' => 'Your work order was rejected',
            'body'  => "{$managerName} rejected \"" . ($wo4?->title ?? 'AHU Compressor — Capacitor Replacement') . "\" (" . ($wo4?->code ?? 'WO-0069') . ") — Reason: Missing risk assessment form.",
            'data'  => ['wo_id' => $wo4?->id ?? 0, 'wo_code' => $wo4?->code ?? 'WO-0069'],
            'read'  => true,
            'at'    => Carbon::now()->subDays(4)->setTime(10, 20),
        ]);

        // 14. new_request — unread (submitted 30 min ago — technician submitted a request)
        $rows[] = $this->notif('new_request', [
            'title' => 'New maintenance request',
            'body'  => "A {$managerName} submitted a High request: \"Emergency: Cooling Fan Failure on CT-01\" (REQ-0041)",
            'data'  => ['request_id' => 0, 'request_code' => 'REQ-0041', 'request_title' => 'Emergency: Cooling Fan Failure on CT-01'],
            'read'  => false,
            'at'    => Carbon::now()->subMinutes(30),
        ]);

        // 15. chat_message — unread (5 min ago — someone sent them a message)
        $rows[] = $this->notif('chat_message', [
            'title' => $managerName,
            'body'  => 'Can you check on the oil leak status on C-02? Day shift needs an update before handover.',
            'data'  => ['conversation_id' => 0, 'conversation_type' => 'direct'],
            'read'  => false,
            'at'    => Carbon::now()->subMinutes(5),
        ]);

        DB::table('notifications')->insert($rows);
        $this->command->info('✓ DemoNotificationSeeder: inserted ' . count($rows) . ' notifications.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function resolveTechnician(): ?object
    {
        // Try to find by test email first
        $byEmail = DB::table('users')
            ->join('members', 'members.user_id', '=', 'users.id')
            ->where('members.company_id', $this->companyId)
            ->whereNull('members.deleted_at')
            ->where('users.email', 'technician@gmao.test')
            ->select('users.id as user_id', 'members.id as member_id', 'users.name')
            ->first();

        if ($byEmail) return $byEmail;

        // Fall back: first technician by role
        return DB::table('members')
            ->join('users', 'users.id', '=', 'members.user_id')
            ->join('member_roles', 'member_roles.member_id', '=', 'members.id')
            ->join('roles', 'roles.id', '=', 'member_roles.role_id')
            ->where('members.company_id', $this->companyId)
            ->whereNull('members.deleted_at')
            ->where('roles.code', 'technician')
            ->select('users.id as user_id', 'members.id as member_id', 'users.name')
            ->orderBy('members.id')
            ->first();
    }

    private function resolveManagerName(): string
    {
        $manager = DB::table('members')
            ->join('users', 'users.id', '=', 'members.user_id')
            ->join('member_roles', 'member_roles.member_id', '=', 'members.id')
            ->join('roles', 'roles.id', '=', 'member_roles.role_id')
            ->where('members.company_id', $this->companyId)
            ->whereNull('members.deleted_at')
            ->whereIn('roles.code', ['manager', 'admin'])
            ->select('users.name')
            ->orderBy('members.id')
            ->first();

        return $manager?->name ?? 'Khalil Ben Salah';
    }

    private function notif(string $type, array $payload): array
    {
        $readAt = $payload['read'] ? $payload['at']->copy()->addMinutes(rand(5, 60)) : null;

        return [
            'user_id'    => $this->techUserId,
            'type'       => $type,
            'title'      => $payload['title'],
            'body'       => $payload['body'],
            'data_json'  => json_encode($payload['data'] ?? []),
            'read_at'    => $readAt,
            'created_at' => $payload['at'],
        ];
    }
}
