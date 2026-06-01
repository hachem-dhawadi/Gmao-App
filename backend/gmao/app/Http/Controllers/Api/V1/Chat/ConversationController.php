<?php

namespace App\Http\Controllers\Api\V1\Chat;

use App\Events\ConversationCreated;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Member;
use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $conversations = $currentMember->conversations()
            ->where('conversations.company_id', $currentCompany->id)
            ->with([
                'members.user',
                'lastMessage.sender.user',
                'lastMessage.attachments',
            ])
            ->orderByDesc(
                Message::select('created_at')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->orderByDesc('created_at')
                    ->limit(1)
            )
            ->get()
            ->map(fn (Conversation $conv) => $this->formatConversation($conv, $currentMember->id));

        return response()->json(['success' => true, 'data' => ['conversations' => $conversations]]);
    }

    public function store(Request $request): JsonResponse
    {
        $currentCompany = $request->attributes->get('currentCompany');
        $currentMember  = $request->attributes->get('currentMember');

        if (! $currentCompany || ! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $request->validate([
            'type'       => 'required|in:direct,group',
            'member_ids' => 'required|array|min:1',
            'member_ids.*' => 'integer|exists:members,id',
            'name'       => 'required_if:type,group|nullable|string|max:100',
        ]);

        $memberIds = array_unique(array_merge([$currentMember->id], $request->member_ids));

        // For direct chats: reuse existing conversation between exactly these 2 members
        if ($request->type === 'direct' && count($memberIds) === 2) {
            $otherId = collect($memberIds)->first(fn ($id) => $id !== $currentMember->id);

            $existing = Conversation::where('company_id', $currentCompany->id)
                ->where('type', 'direct')
                ->whereHas('members', fn ($q) => $q->where('members.id', $currentMember->id))
                ->whereHas('members', fn ($q) => $q->where('members.id', $otherId))
                ->first();

            if ($existing) {
                $existing->load(['members.user', 'lastMessage.sender.user', 'lastMessage.attachments']);
                return response()->json([
                    'success' => true,
                    'data'    => ['conversation' => $this->formatConversation($existing, $currentMember->id)],
                ]);
            }
        }

        $conversation = DB::transaction(function () use ($request, $currentCompany, $currentMember, $memberIds) {
            $conv = Conversation::create([
                'company_id'           => $currentCompany->id,
                'type'                 => $request->type,
                'name'                 => $request->type === 'group' ? $request->name : null,
                'created_by_member_id' => $currentMember->id,
            ]);

            $conv->members()->attach(array_fill_keys($memberIds, ['joined_at' => now()]));

            return $conv;
        });

        $conversation->load(['members.user', 'lastMessage.sender.user', 'lastMessage.attachments']);

        $formatted = $this->formatConversation($conversation, $currentMember->id);

        // Notify every other member so the conversation appears in their sidebar
        // immediately — format from each recipient's perspective so name/avatar are correct.
        $conversation->members()
            ->where('members.id', '!=', $currentMember->id)
            ->get()
            ->each(function ($recipient) use ($conversation) {
                $recipientFormatted = $this->formatConversation($conversation, $recipient->id);
                broadcast(new ConversationCreated($recipient->id, $recipientFormatted));
            });

        return response()->json([
            'success' => true,
            'data'    => ['conversation' => $formatted],
        ], 201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        $conversation->members()->updateExistingPivot($currentMember->id, [
            'last_read_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function files(Request $request, Conversation $conversation): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember || ! $conversation->members()->where('members.id', $currentMember->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $files = MessageAttachment::whereHas('message', fn ($q) => $q->where('conversation_id', $conversation->id))
            ->with('message.sender.user')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'url'           => $a->url,
                'mime_type'     => $a->mime_type,
                'size_bytes'    => $a->size_bytes,
                'created_at'    => $a->created_at?->toISOString(),
                'sender_name'   => $a->message?->sender?->user?->name,
            ]);

        return response()->json(['success' => true, 'data' => ['files' => $files]]);
    }

    public function leave(Request $request, Conversation $conversation): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if ($conversation->type !== 'group') {
            return response()->json(['success' => false, 'message' => 'Cannot leave a direct conversation.'], 422);
        }

        if (! $conversation->members()->where('members.id', $currentMember->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Not a member.'], 403);
        }

        $conversation->members()->detach($currentMember->id);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember || ! $conversation->members()->where('members.id', $currentMember->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        if ($conversation->type === 'direct') {
            // For direct: just detach so it disappears for this user only
            $conversation->members()->detach($currentMember->id);
        } else {
            // For group: only creator can hard-delete
            if ($conversation->created_by_member_id !== $currentMember->id) {
                return response()->json(['success' => false, 'message' => 'Only the group creator can delete it.'], 403);
            }
            $conversation->delete();
        }

        return response()->json(['success' => true]);
    }

    private function formatConversation(Conversation $conv, int $currentMemberId): array
    {
        $otherMembers = $conv->members->filter(fn ($m) => $m->id !== $currentMemberId)->values();
        $pivot        = $conv->members->firstWhere('id', $currentMemberId)?->pivot;
        $lastReadAt   = $pivot?->last_read_at;

        $unreadCount = $lastReadAt
            ? $conv->messages()->where('created_at', '>', $lastReadAt)->count()
            : $conv->messages()->count();

        // For direct chats: name/avatar = the other person
        if ($conv->type === 'direct') {
            $other = $otherMembers->first();
            $name  = $other?->user?->name ?? 'Unknown';
            $avatar = $other?->user?->avatar_url ?? null;
        } else {
            $name   = $conv->name ?? 'Group';
            $avatar = $conv->avatar;
        }

        $lastMsg = $conv->lastMessage;

        return [
            'id'                   => $conv->id,
            'type'                 => $conv->type,
            'name'                 => $name,
            'avatar'               => $avatar,
            'unread_count'         => $unreadCount,
            'created_by_member_id' => $conv->created_by_member_id,
            'members'      => $conv->members->map(fn ($m) => [
                'id'     => $m->id,
                'name'   => $m->user?->name,
                'avatar' => $m->user?->avatar_url,
            ]),
            'last_message' => $lastMsg ? [
                'id'         => $lastMsg->id,
                'body'       => $lastMsg->body,
                'type'       => $lastMsg->type,
                'created_at' => $lastMsg->created_at?->toISOString(),
                'sender'     => [
                    'id'     => $lastMsg->sender?->id,
                    'name'   => $lastMsg->sender?->user?->name,
                    'avatar' => $lastMsg->sender?->user?->avatar_url,
                ],
            ] : null,
            'created_at' => $conv->created_at?->toISOString(),
        ];
    }
}
