<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Member;
use App\Models\Notification;
use App\Models\PmPlan;
use App\Models\PurchaseOrder;
use App\Models\WorkOrder;
use Illuminate\Support\Carbon;

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
        }
    }

    // ── Work Order: status changed ────────────────────────────────────────────

    public static function notifyWoStatusChanged(WorkOrder $wo, string $oldStatus, string $newStatus, int $changedByMemberId): void
    {
        $changedBy = Member::query()->with('user')->find($changedByMemberId);
        $fromName  = $changedBy?->user?->name ?? 'Someone';

        $assignedUserIds = $wo->assignedMembers()
            ->with('user')
            ->where('members.id', '!=', $changedByMemberId)
            ->get()
            ->pluck('user_id')
            ->filter()
            ->all();

        foreach ($assignedUserIds as $userId) {
            self::create($userId, 'wo_status_changed', [
                'title' => "Work order status updated",
                'body'  => "{$fromName} changed \"{$wo->title}\" ({$wo->code}) from {$oldStatus} to {$newStatus}",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title, 'new_status' => $newStatus],
            ]);
        }
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

    // ── Work Order: overdue ───────────────────────────────────────────────────

    public static function notifyWoOverdue(WorkOrder $wo): void
    {
        $recipientIds = [];

        // Notify assigned members
        foreach ($wo->assignedMembers()->with('user')->get() as $member) {
            if ($member->user_id) $recipientIds[] = $member->user_id;
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

        foreach (array_unique($recipientIds) as $userId) {
            self::create($userId, 'wo_overdue', [
                'title' => 'Work order overdue',
                'body'  => "Work order \"{$wo->title}\" ({$wo->code}) is past its due date.",
                'data'  => ['wo_id' => $wo->id, 'wo_code' => $wo->code, 'wo_title' => $wo->title],
            ]);
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
