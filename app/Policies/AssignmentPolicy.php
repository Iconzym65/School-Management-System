<?php

namespace App\Policies;

use App\Models\Assignment;
use App\Models\User;

class AssignmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isTeacher();
    }

    public function view(User $user, Assignment $assignment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($assignment->teacher_id === $user->id) {
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
        return $user->isTeacher() && $assignment->teacher_id === $user->id;
    }

    public function delete(User $user, Assignment $assignment): bool
    {
        return $this->update($user, $assignment);
    }
}
