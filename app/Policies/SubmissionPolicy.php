<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isTeacher();
    }

    public function view(User $user, Submission $submission): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $submission->assignment->teacher_id === $user->id;
        }

        return $user->isStudent() && $submission->student_id === $user->id;
    }

    public function update(User $user, Submission $submission): bool
    {
        return $user->isTeacher() && $submission->assignment->teacher_id === $user->id;
    }

    public function delete(User $user, Submission $submission): bool
    {
        return $this->update($user, $submission);
    }
}
