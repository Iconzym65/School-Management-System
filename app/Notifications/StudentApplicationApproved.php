<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StudentApplicationApproved extends Notification
{
    use Queueable;

    public function __construct(private readonly string $studentNumber) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your student application has been approved')
            ->greeting('Welcome '.$notifiable->name)
            ->line('Your vacation school application has been approved.')
            ->line('Student number: '.$this->studentNumber)
            ->line('Use the password you supplied during registration to sign in.')
            ->action('Open student portal', url('/login'));
    }
}
