<?php

namespace App\Mail;

use App\Models\WorkOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkOrderAssigned extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public WorkOrder $workOrder,
        public string    $technicianName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[{$this->workOrder->code}] Work Order Assigned — {$this->workOrder->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.work-order-assigned',
            with: [
                'wo'             => $this->workOrder,
                'technicianName' => $this->technicianName,
            ],
        );
    }

    public function attachments(): array { return []; }
}
