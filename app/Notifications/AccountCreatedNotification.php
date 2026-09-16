<?php

namespace App\Notifications;

use App\Enums\RoleSlug;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class AccountCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The number of times the queued notification job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the queued notification.
     *
     * @var array<int, int>
     */
    public array $backoff = [30, 90, 300];

    /**
     * Create a new notification instance.
     *
     * @param  string|null  $temporaryPassword  The plaintext temporary password if one was generated.
     * @param  string|null  $role  Explicit role override ('teacher' or 'student'), if known.
     */
    public function __construct(
        public readonly ?string $temporaryPassword = null,
        public readonly ?string $role = null,
    ) {
        // Ensure dispatch happens only after any open database transaction commits.
        $this->afterCommit();
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
        if ($notifiable instanceof User) {
            $notifiable->loadMissing('role');
        }

        $isTeacher = ($this->role === 'teacher')
            || ($notifiable instanceof User && $notifiable->isTeacher())
            || ($notifiable->role?->slug === RoleSlug::Teacher->value)
            || ! empty($notifiable->employee_id);

        $isStudent = ($this->role === 'student')
            || ($notifiable instanceof User && $notifiable->isStudent())
            || ($notifiable->role?->slug === RoleSlug::Student->value)
            || ! empty($notifiable->student_number);

        $roleName = match (true) {
            $isTeacher => 'Teacher',
            $isStudent => 'Student',
            default => 'Staff',
        };

        if ($isTeacher) {
            $identifierLabel = 'Employee ID';
            $identifierValue = $notifiable->employee_id ?? 'Pending Assignment';
            $loginUrl = url('/teacher-login');
        } elseif ($isStudent) {
            $identifierLabel = 'Student Number';
            $identifierValue = $notifiable->student_number ?? 'Pending Assignment';
            $loginUrl = url('/login');
        } else {
            $identifierLabel = 'Account ID';
            $identifierValue = (string) ($notifiable->id ?? 'N/A');
            $loginUrl = url('/login');
        }

        $mustChangePassword = (bool) ($notifiable->must_change_password ?? ! empty($this->temporaryPassword));

        Log::info('[NOTIFICATION] Preparing welcome email for account.', [
            'user_id' => $notifiable->id ?? null,
            'email' => $notifiable->email,
            'role' => $roleName,
            'identifier_label' => $identifierLabel,
            'has_temporary_password' => ! empty($this->temporaryPassword),
            'login_url' => $loginUrl,
        ]);

        return (new MailMessage)
            ->subject('Welcome to SHS Vacation Classes - Your Account Details')
            ->view('emails.account-created', [
                'user' => $notifiable,
                'name' => $notifiable->name,
                'email' => $notifiable->email,
                'roleName' => $roleName,
                'isTeacher' => $isTeacher,
                'isStudent' => $isStudent,
                'identifierLabel' => $identifierLabel,
                'identifierValue' => $identifierValue,
                'temporaryPassword' => $this->temporaryPassword,
                'hasTemporaryPassword' => ! empty($this->temporaryPassword),
                'mustChangePassword' => $mustChangePassword,
                'loginUrl' => $loginUrl,
                'supportEmail' => config('mail.from.address', 'support@shsvacationclasses.edu'),
            ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('[NOTIFICATION] Failed to process AccountCreatedNotification.', [
            'role' => $this->role,
            'has_temp_password' => ! empty($this->temporaryPassword),
            'error_message' => $exception->getMessage(),
        ]);
    }
}
