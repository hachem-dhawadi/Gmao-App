<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployeePasswordSetupNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $token,
        private readonly string $email
    ) {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $setupUrl = $frontendUrl.'/set-password?token='.$this->token.'&email='.urlencode($this->email);

        return (new MailMessage)
            ->subject('Set up your GMAO account password')
            ->line('An account was created for you. Set your password to access the platform.')
            ->action('Set Password', $setupUrl)
            ->line('If you were not expecting this, contact your administrator.');
    }
}
