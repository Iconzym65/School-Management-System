<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TeacherAccountProvisioned extends Notification
{
    use Queueable;

    public function __construct(private string $temporaryPassword) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your lecturer account has been created')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('An administrator provisioned a teaching account for you on the School Management System.')
            ->line('Email: '.$notifiable->email)
            ->line('Temporary password: '.$this->temporaryPassword)
            ->line('You will be required to change this password on first login.')
            ->line('If you did not expect this message, contact the school administrator.');
    }
}
