<?php

namespace App\Http\Controllers\Api\V1\Chat;

use App\Events\MessageSent;
use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        // Ensure member belongs to this conversation
        if (! $conversation->members()->where('members.id', $currentMember->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $perPage = 50;
        $before  = $request->query('before');

        // Fetch the $perPage most-recent messages (DESC), then reverse to chronological order
        // so the frontend can render oldest-at-top, newest-at-bottom.
        $messages = $conversation->messages()
            ->with(['sender.user', 'attachments'])
            ->when($before, fn ($q) => $q->where('id', '<', (int) $before))
            ->latest('created_at')
            ->take($perPage)
            ->get()
            ->reverse()
            ->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'messages'   => $messages->map(fn ($m) => $this->formatMessage($m, $currentMember->id)),
                'has_more'   => $messages->isNotEmpty() && $conversation->messages()
                    ->when($before, fn ($q) => $q->where('id', '<', $messages->first()->id))
                    ->where('id', '<', $messages->first()->id ?? 0)
                    ->exists(),
            ],
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember) {
            return response()->json(['success' => false, 'message' => 'Context missing.'], 400);
        }

        if (! $conversation->members()->where('members.id', $currentMember->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'body'         => 'nullable|string|max:5000',
            'files'        => 'nullable|array|max:5',
            'files.*'      => 'file|max:10240',
        ]);

        if (! $request->filled('body') && ! $request->hasFile('files')) {
            return response()->json(['success' => false, 'message' => 'Message body or file required.'], 422);
        }

        $hasFiles = $request->hasFile('files');
        $isImage  = $hasFiles && collect($request->file('files'))->every(
            fn ($f) => str_starts_with($f->getMimeType(), 'image/')
        );

        $type = $hasFiles ? ($isImage ? 'image' : 'file') : 'text';

        $message = Message::create([
            'conversation_id'  => $conversation->id,
            'sender_member_id' => $currentMember->id,
            'body'             => $request->body,
            'type'             => $type,
        ]);

        if ($hasFiles) {
            foreach ($request->file('files') as $file) {
                $path = $file->store("chat/{$conversation->id}", 'public');
                MessageAttachment::create([
                    'message_id'    => $message->id,
                    'original_name' => $file->getClientOriginalName(),
                    'path'          => $path,
                    'mime_type'     => $file->getMimeType(),
                    'size_bytes'    => $file->getSize(),
                ]);
            }
        }

        $message->load(['sender.user', 'attachments']);

        // Mark sender as read immediately
        $conversation->members()->updateExistingPivot($currentMember->id, [
            'last_read_at' => now(),
        ]);

        $formatted = $this->formatMessage($message, $currentMember->id);

        broadcast(new MessageSent($conversation->id, $formatted))->toOthers();

        // Notify each recipient on their personal channel (works even if they don't have the conversation open)
        $conversation->members()
            ->with('user')
            ->where('members.id', '!=', $currentMember->id)
            ->get()
            ->each(function ($recipient) use ($conversation, $formatted, $currentMember) {
                // Name/avatar from recipient's perspective
                if ($conversation->type === 'direct') {
                    $senderMember = $conversation->members()->with('user')
                        ->where('members.id', $currentMember->id)->first();
                    $name   = $senderMember?->user?->name ?? 'Unknown';
                    $avatar = $senderMember?->user?->avatar_url;
                } else {
                    $name   = $conversation->name;
                    $avatar = $conversation->avatar;
                }

                // Unread count for this recipient
                $pivot       = $conversation->members()->where('members.id', $recipient->id)->first()?->pivot;
                $unreadCount = $conversation->messages()
                    ->where('created_at', '>', $pivot?->last_read_at ?? '1970-01-01')
                    ->count();

                broadcast(new NewChatMessage($recipient->id, [
                    'conversation' => [
                        'id'           => $conversation->id,
                        'name'         => $name,
                        'type'         => $conversation->type,
                        'avatar'       => $avatar,
                        'unread_count' => $unreadCount,
                    ],
                    'message' => array_merge($formatted, ['is_mine' => false]),
                ]));
            });

        return response()->json(['success' => true, 'data' => ['message' => $formatted]], 201);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $currentMember = $request->attributes->get('currentMember');

        if (! $currentMember || $message->sender_member_id !== $currentMember->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        // Delete attachment files from storage
        foreach ($message->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->path);
        }

        $message->delete();

        return response()->json(['success' => true]);
    }

    private function formatMessage(Message $message, int $currentMemberId): array
    {
        return [
            'id'              => $message->id,
            'conversation_id' => $message->conversation_id,
            'body'            => $message->body,
            'type'            => $message->type,
            'is_mine'         => $message->sender_member_id === $currentMemberId,
            'created_at'      => $message->created_at?->toISOString(),
            'sender'          => [
                'id'     => $message->sender?->id,
                'name'   => $message->sender?->user?->name,
                'avatar' => $message->sender?->user?->avatar_url,
            ],
            'attachments' => $message->attachments->map(fn ($a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'url'           => $a->url,
                'mime_type'     => $a->mime_type,
                'size_bytes'    => $a->size_bytes,
            ]),
        ];
    }
}
