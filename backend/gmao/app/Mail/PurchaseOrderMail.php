<?php

namespace App\Mail;

use App\Models\PurchaseOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PurchaseOrderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PurchaseOrder $purchaseOrder) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Purchase Order {$this->purchaseOrder->code}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.purchase_order',
        );
    }
}
