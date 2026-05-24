<?php

namespace App\Mail;

use App\Models\Item;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LowStockAlert extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Item   $item,
        public float  $currentStock,
        public float  $minStock,
        public string $recipientName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⚠ Low Stock: {$this->item->name} [{$this->item->code}]",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.low-stock-alert',
            with: [
                'item'          => $this->item,
                'currentStock'  => $this->currentStock,
                'minStock'      => $this->minStock,
                'recipientName' => $this->recipientName,
            ],
        );
    }

    public function attachments(): array { return []; }
}
