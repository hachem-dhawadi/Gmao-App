<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewChatMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $recipientMemberId,
        public array $payload,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.' . $this->recipientMemberId)];
    }

    public function broadcastAs(): string
    {
        return 'new.chat.message';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
