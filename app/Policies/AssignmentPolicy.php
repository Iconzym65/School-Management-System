<?php

namespace App\Policies;

use App\Models\Assignment;
use App\Models\User;

class AssignmentPolicy
{
    public function view(User $user, Assignment $assignment): bool
    {
        if ($user->isAdmin() || $assignment->teacher_id === $user->id) {
            return true;
        }

        if ($user->isStudent()) {
            return $assignment->is_published
                && $assignment->course->enrollments()->where('student_id', $user->id)->exists();
        }

        return false;
    }

    public function update(User $user, Assignment $assignment): bool
    {
        return $user->isAdmin() || $assignment->teacher_id === $user->id;
    }
}
