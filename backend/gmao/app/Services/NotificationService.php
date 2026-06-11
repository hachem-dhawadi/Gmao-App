<?php

namespace App\Services;

use App\Mail\LowStockAlert;
use App\Mail\WorkOrderAssigned as WorkOrderAssignedMail;
use App\Mail\WorkOrderDueSoon as WorkOrderDueSoonMail;
use App\Mail\WorkOrderOverdue as WorkOrderOverdueMail;
use App\Mail\PmPlanDue as PmPlanDueMail;
use App\Models\Item;
use App\Models\MaintenanceRequest;
use App\Models\Member;
use App\Models\Notification;
use App\Models\PmPlan;
use App\Models\PmTrigger;
use App\Models\PurchaseOrder;
use App\Models\WorkOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    // ── Work Order: assigned ──────────────────────────────────────────────────

    public static function notifyWoAssigned(WorkOrder $wo, array $memberIds, int $assignedByMemberId): void
    {
        $assignedBy = Member::query()->with('user')->find($assignedByMemberId);
        $fromName   = $assignedBy?->user?->name ?? 'Someone';

        $members = Member::query()
            ->with('user')
            ->whereIn('id', $memberIds)
            ->where('id', '!=', $assignedByMemberId)
            ->get();

        foreach ($members as $member) {
            if (! $member->user_id) continue;

            self::create($member->user_id, 'wo_assigned', [
                'title' => "You were assigned to a work order",
                'body'  => "{$fromName} assigned you to \"{$wo->title}\" ({$wo->code})",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
            ]);

            // Email
            $email = $member->user?->email;
            $name  = $member->user?->name ?? 'Technician';
            if ($email) {
                try {
                    Mail::to($email)->send(new WorkOrderAssignedMail($wo, $name));
                } catch (\Throwable $e) {
                    Log::warning("Email failed (wo_assigned) to {$email}: " . $e->getMessage());
                }
            }
        }
    }

    // ── Work Order: status changed ────────────────────────────────────────────

    public static function notifyWoStatusChanged(WorkOrder $wo, string $oldStatus, string $newStatus, int $changedByMemberId): void
    {
        $changedBy = Member::query()->with('user')->find($changedByMemberId);
        $fromName  = $changedBy?->user?->name ?? 'Someone';

        $wo->loadMissing('assignedMember.user');
        $assignedMember  = $wo->assignedMember;
        $assignedUserIds = $assignedMember && $assignedMember->id !== $changedByMemberId && $assignedMember->user_id
            ? [$assignedMember->user_id]
            : [];

        foreach ($assignedUserIds as $userId) {
            self::create($userId, 'wo_status_changed', [
                'title' => "Work order status updated",
                'body'  => "{$fromName} changed \"{$wo->title}\" ({$wo->code}) from {$oldStatus} to {$newStatus}",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title, 'new_status' => $newStatus],
            ]);
        }
    }

    // ── Work Order: pending approval ─────────────────────────────────────────

    public static function notifyWoPendingApproval(WorkOrder $wo, array $approverMemberIds, int $submittedByMemberId): void
    {
        $submittedBy = Member::query()->with('user')->find($submittedByMemberId);
        $fromName    = $submittedBy?->user?->name ?? 'Someone';

        $approvers = Member::query()->with('user')->whereIn('id', $approverMemberIds)->get();

        foreach ($approvers as $approver) {
            if (! $approver->user_id) continue;

            self::create($approver->user_id, 'wo_pending_approval', [
                'title' => "Work order awaiting your approval",
                'body'  => "{$fromName} submitted \"{$wo->title}\" ({$wo->code}) — please review and approve or reject.",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
            ]);
        }
    }

    // ── Work Order: approved ──────────────────────────────────────────────────

    public static function notifyWoApproved(WorkOrder $wo, int $approvedByMemberId): void
    {
        $approvedBy = Member::query()->with('user')->find($approvedByMemberId);
        $fromName   = $approvedBy?->user?->name ?? 'Someone';

        $creator = Member::query()->with('user')->find($wo->created_by_member_id);
        if (! $creator?->user_id || $creator->id === $approvedByMemberId) return;

        self::create($creator->user_id, 'wo_approved', [
            'title' => "Your work order was approved",
            'body'  => "{$fromName} approved \"{$wo->title}\" ({$wo->code}) — it is now open.",
            'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
        ]);
    }

    // ── Work Order: rejected ──────────────────────────────────────────────────

    public static function notifyWoRejected(WorkOrder $wo, int $rejectedByMemberId, ?string $reason = null): void
    {
        $rejectedBy = Member::query()->with('user')->find($rejectedByMemberId);
        $fromName   = $rejectedBy?->user?->name ?? 'Someone';

        $creator = Member::query()->with('user')->find($wo->created_by_member_id);
        if (! $creator?->user_id || $creator->id === $rejectedByMemberId) return;

        $body = "{$fromName} rejected \"{$wo->title}\" ({$wo->code})";
        if ($reason) {
            $body .= " — Reason: {$reason}";
        }

        self::create($creator->user_id, 'wo_rejected', [
            'title' => "Your work order was rejected",
            'body'  => $body,
            'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
        ]);
    }

    // ── Work Order: @mention in comment ──────────────────────────────────────

    public static function notifyMentions(WorkOrder $wo, string $commentBody, int $authorMemberId): void
    {
        // Mentions are stored as @[Full Name] — extract bracketed names
        preg_match_all('/@\[([^\]]+)\]/u', $commentBody, $matches);
        $mentionedNames = array_unique(array_filter(array_map('trim', $matches[1] ?? [])));

        if (empty($mentionedNames)) return;

        $author    = Member::query()->with('user')->find($authorMemberId);
        $fromName  = $author?->user?->name ?? 'Someone';
        $companyId = $wo->company_id;

        // Load all company members once and match by exact name
        $candidates = Member::query()
            ->with('user')
            ->where('company_id', $companyId)
            ->where('id', '!=', $authorMemberId)
            ->get()
            ->filter(fn ($m) => $m->user?->name);

        foreach ($mentionedNames as $name) {
            $member = $candidates->first(fn ($m) => $m->user->name === $name);

            if (! $member || ! $member->user_id) continue;

            self::create($member->user_id, 'comment_mention', [
                'title' => "You were mentioned in a comment",
                'body'  => "{$fromName} mentioned you in \"{$wo->title}\" ({$wo->code})",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
            ]);
        }
    }

    // ── Inventory: low stock ─────────────────────────────────────────────────

    public static function notifyLowStock(Item $item, float $totalStock): void
    {
        $recipients = Member::query()
            ->where('company_id', $item->company_id)
            ->whereHas('roles', fn ($q) => $q->whereIn('code', ['admin', 'manager']))
            ->with('user')
            ->get();

        $unit = $item->unit ?? 'units';

        foreach ($recipients as $member) {
            if (! $member->user_id) continue;

            self::create($member->user_id, 'low_stock', [
                'title' => "Low stock: {$item->name}",
                'body'  => "\"{$item->name}\" ({$item->code}) is at {$totalStock} {$unit}, at or below the minimum of {$item->min_stock} {$unit}.",
                'data'  => [
                    'item_id'   => $item->id,
                    'item_name' => $item->name,
                    'item_code' => $item->code,
                ],
            ]);

            // Email
            $email = $member->user?->email;
            $name  = $member->user?->name ?? 'Manager';
            if ($email) {
                try {
                    Mail::to($email)->send(new LowStockAlert($item, $totalStock, (float) $item->min_stock, $name));
                } catch (\Throwable $e) {
                    Log::warning("Email failed (low_stock) to {$email}: " . $e->getMessage());
                }
            }
        }
    }

    // ── PM Plan: auto-generated a work order ─────────────────────────────────

    public static function notifyPmWoGenerated(WorkOrder $wo, PmPlan $plan): void
    {
        $managers = Member::query()
            ->where('company_id', $plan->company_id)
            ->whereHas('roles', fn ($q) => $q->whereIn('code', ['admin', 'manager']))
            ->with('user')
            ->get();

        foreach ($managers as $manager) {
            if (! $manager->user_id) continue;

            self::create($manager->user_id, 'pm_wo_generated', [
                'title' => 'PM plan auto-generated a work order',
                'body'  => "Plan \"{$plan->name}\" ({$plan->code}) automatically created work order {$wo->code}.",
                'data'  => [
                    'wo_id'   => $wo->id,
                    'wo_code' => $wo->code,
                    'pm_id'   => $plan->id,
                    'pm_code' => $plan->code,
                ],
            ]);
        }
    }

    // ── PM Plan: assigned ────────────────────────────────────────────────────

    public static function notifyPmAssigned(PmPlan $plan, int $assignedMemberId, int $assignedByMemberId): void
    {
        if ($assignedMemberId === $assignedByMemberId) return;

        $member = Member::query()->with('user')->find($assignedMemberId);
        if (! $member?->user_id) return;

        $assigner = Member::query()->with('user')->find($assignedByMemberId);
        $fromName = $assigner?->user?->name ?? 'Someone';

        self::create($member->user_id, 'pm_assigned', [
            'title' => 'You were assigned to a PM plan',
            'body'  => "{$fromName} assigned you to \"{$plan->name}\" ({$plan->code})",
            'data'  => ['pm_id' => $plan->id, 'pm_code' => $plan->code, 'pm_name' => $plan->name],
        ]);
    }

    // ── Member: new member added ──────────────────────────────────────────────

    public static function notifyNewMember(Member $newMember, int $companyId): void
    {
        $admins = Member::query()
            ->where('company_id', $companyId)
            ->where('id', '!=', $newMember->id)
            ->whereHas('roles', fn ($q) => $q->whereIn('code', ['admin', 'manager']))
            ->with('user')
            ->get();

        $memberName = $newMember->user?->name ?? 'A new member';

        foreach ($admins as $admin) {
            if (! $admin->user_id) continue;

            self::create($admin->user_id, 'new_member', [
                'title' => 'New member added',
                'body'  => "{$memberName} has been added to the company.",
                'data'  => ['member_id' => $newMember->id, 'member_name' => $memberName],
            ]);
        }
    }

    // ── Purchase Order: status changed to ordered ─────────────────────────────

    public static function notifyPoOrdered(PurchaseOrder $po, int $changedByMemberId): void
    {
        $creator = $po->createdBy;
        if (! $creator || $creator->id === $changedByMemberId || ! $creator->user_id) return;

        self::create($creator->user_id, 'po_ordered', [
            'title' => 'Purchase order submitted',
            'body'  => "PO {$po->code} has been submitted to the supplier.",
            'data'  => ['po_id' => $po->id, 'po_code' => $po->code],
        ]);
    }

    // ── Work Order: due soon ──────────────────────────────────────────────────

    public static function notifyWoDueSoon(WorkOrder $wo, int $hoursLeft): void
    {
        $recipientIds = [];

        $wo->loadMissing('assignedMember.user');
        if ($wo->assignedMember?->user_id) {
            $recipientIds[] = $wo->assignedMember->user_id;
        }

        $managers = Member::query()
            ->where('company_id', $wo->company_id)
            ->whereHas('roles', fn ($q) => $q->whereIn('code', ['admin', 'manager']))
            ->with('user')
            ->get();

        foreach ($managers as $manager) {
            if ($manager->user_id) $recipientIds[] = $manager->user_id;
        }

        $assignedCollection = $wo->assignedMember ? collect([$wo->assignedMember]) : collect();
        $allMembers = $assignedCollection->concat($managers)->keyBy('user_id');

        foreach (array_unique($recipientIds) as $userId) {
            self::create($userId, 'wo_due_soon', [
                'title' => "Work order due in {$hoursLeft}h",
                'body'  => "Work order \"{$wo->title}\" ({$wo->code}) is due in approximately {$hoursLeft} hours.",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title, 'hours_left' => $hoursLeft],
            ]);

            $member = $allMembers->get($userId);
            $email  = $member?->user?->email;
            $name   = $member?->user?->name ?? 'Team Member';
            if ($email) {
                try {
                    Mail::to($email)->send(new WorkOrderDueSoonMail($wo, $name, $hoursLeft));
                } catch (\Throwable $e) {
                    Log::warning("Email failed (wo_due_soon) to {$email}: " . $e->getMessage());
                }
            }
        }
    }

    // ── Work Order: overdue ───────────────────────────────────────────────────

    public static function notifyWoOverdue(WorkOrder $wo): void
    {
        $recipientIds = [];

        // Notify assigned member
        $wo->loadMissing('assignedMember.user');
        if ($wo->assignedMember?->user_id) {
            $recipientIds[] = $wo->assignedMember->user_id;
        }

        // Notify admins/managers
        $managers = Member::query()
            ->where('company_id', $wo->company_id)
            ->whereHas('roles', fn ($q) => $q->whereIn('code', ['admin', 'manager']))
            ->with('user')
            ->get();

        foreach ($managers as $manager) {
            if ($manager->user_id) $recipientIds[] = $manager->user_id;
        }

        // Build user-id → member map for email sending
        $assignedCollection = $wo->assignedMember ? collect([$wo->assignedMember]) : collect();
        $allMembers = $assignedCollection->concat($managers)->keyBy('user_id');

        foreach (array_unique($recipientIds) as $userId) {
            self::create($userId, 'wo_overdue', [
                'title' => 'Work order overdue',
                'body'  => "Work order \"{$wo->title}\" ({$wo->code}) is past its due date.",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
            ]);

            // Email
            $member = $allMembers->get($userId);
            $email  = $member?->user?->email;
            $name   = $member?->user?->name ?? 'Team Member';
            if ($email) {
                try {
                    Mail::to($email)->send(new WorkOrderOverdueMail($wo, $name));
                } catch (\Throwable $e) {
                    Log::warning("Email failed (wo_overdue) to {$email}: " . $e->getMessage());
                }
            }
        }
    }

    // ── Maintenance Request: new request submitted ────────────────────────────

    public static function notifyNewRequest(MaintenanceRequest $req): void
    {
        $requester   = $req->requestedBy;
        $fromName    = $requester?->user?->name ?? 'Someone';
        $priority    = ucfirst($req->priority);

        $managers = Member::query()
            ->where('company_id', $req->company_id)
            ->where('id', '!=', $req->requested_by_member_id)
            ->whereHas('roles', fn ($q) => $q->whereIn('code', ['admin', 'manager']))
            ->with('user')
            ->get();

        foreach ($managers as $manager) {
            if (! $manager->user_id) continue;

            self::create($manager->user_id, 'new_request', [
                'title' => "New maintenance request",
                'body'  => "{$fromName} submitted a {$priority} request: \"{$req->title}\" ({$req->code})",
                'data'  => [
                    'request_id'    => $req->id,
                    'request_code'  => $req->code,
                    'request_title' => $req->title,
                ],
            ]);
        }
    }

    // ── Maintenance Request: converted or rejected ────────────────────────────

    public static function notifyRequestReviewed(MaintenanceRequest $req, string $status, ?string $woCode = null): void
    {
        $requester = $req->requestedBy;
        if (! $requester?->user_id) return;

        $reviewer  = $req->reviewedBy;
        $fromName  = $reviewer?->user?->name ?? 'A manager';

        if ($status === 'converted') {
            self::create($requester->user_id, 'request_converted', [
                'title' => "Your request has been approved",
                'body'  => "{$fromName} converted your request \"{$req->title}\" ({$req->code}) into work order {$woCode}.",
                'data'  => [
                    'request_id'   => $req->id,
                    'request_code' => $req->code,
                    'wo_code'      => $woCode,
                ],
            ]);
        } else {
            $reason = $req->review_note ? " Reason: {$req->review_note}" : '';
            self::create($requester->user_id, 'request_rejected', [
                'title' => "Your request has been rejected",
                'body'  => "{$fromName} rejected your request \"{$req->title}\" ({$req->code}).{$reason}",
                'data'  => [
                    'request_id'   => $req->id,
                    'request_code' => $req->code,
                ],
            ]);
        }
    }

    // ── PM Plan: overdue (called by daily scheduler) ──────────────────────────

    public static function notifyPmOverdue(PmPlan $plan, PmTrigger $trigger): void
    {
        if (! $plan->assigned_member_id) return;

        $member = Member::query()->with('user')->find($plan->assigned_member_id);
        if (! $member?->user_id) return;

        $name  = $member->user?->name ?? 'Team Member';
        $email = $member->user?->email;

        self::create($member->user_id, 'pm_overdue', [
            'title' => "PM plan overdue: {$plan->name}",
            'body'  => "PM plan \"{$plan->name}\" ({$plan->code}) is overdue and has not been executed.",
            'data'  => ['pm_id' => $plan->id, 'pm_code' => $plan->code],
        ]);

        if ($email) {
            try {
                Mail::to($email)->send(new PmPlanDueMail($plan, $trigger, $name, true));
            } catch (\Throwable $e) {
                Log::warning("Email failed (pm_overdue) to {$email}: " . $e->getMessage());
            }
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private static function create(int $userId, string $type, array $payload): void
    {
        Notification::query()->create([
            'user_id'    => $userId,
            'type'       => $type,
            'title'      => $payload['title'],
            'body'       => $payload['body'],
            'data_json'  => json_encode($payload['data'] ?? []),
            'created_at' => Carbon::now(),
        ]);
    }
}
