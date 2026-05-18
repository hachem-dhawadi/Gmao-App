<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Member;
use App\Models\Notification;
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
