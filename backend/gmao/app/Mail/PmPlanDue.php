<?php

namespace App\Mail;

use App\Models\PmPlan;
use App\Models\PmTrigger;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PmPlanDue extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PmPlan    $plan,
        public PmTrigger $trigger,
        public string    $recipientName,
        public bool      $isOverdue = false,
    ) {}

    public function envelope(): Envelope
    {
        $prefix = $this->isOverdue ? '⚠ Overdue PM' : 'PM Due';
        return new Envelope(
            subject: "{$prefix}: [{$this->plan->code}] {$this->plan->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.pm-plan-due',
            with: [
                'plan'          => $this->plan,
                'trigger'       => $this->trigger,
                'recipientName' => $this->recipientName,
                'isOverdue'     => $this->isOverdue,
            ],
        );
    }

    public function attachments(): array { return []; }
}
