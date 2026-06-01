<?php

use App\Models\Member;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{memberId}', function ($user, int $memberId) {
    return Member::where('id', $memberId)->where('user_id', $user->id)->exists();
});

Broadcast::channel('conversation.{conversationId}', function ($user, int $conversationId) {
    return Member::where('user_id', $user->id)
        ->whereHas('conversations', function ($q) use ($conversationId) {
            $q->where('conversations.id', $conversationId);
        })
        ->exists();
});
