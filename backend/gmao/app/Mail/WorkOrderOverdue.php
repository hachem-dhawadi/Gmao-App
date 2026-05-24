<?php

namespace App\Mail;

use App\Models\WorkOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkOrderOverdue extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public WorkOrder $workOrder,
        public string    $recipientName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⚠ Overdue: [{$this->workOrder->code}] {$this->workOrder->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.work-order-overdue',
            with: [
                'wo'            => $this->workOrder,
                'recipientName' => $this->recipientName,
            ],
        );
    }

    public function attachments(): array { return []; }
}
