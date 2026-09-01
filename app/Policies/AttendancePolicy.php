<?php

namespace App\Policies;

use App\Models\Attendance;
use App\Models\User;

class AttendancePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isTeacher();
    }

    public function view(User $user, Attendance $attendance): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $attendance->timetable->teacher_id === $user->id;
        }

        return $user->isStudent() && $attendance->student_id === $user->id;
    }

    public function update(User $user, Attendance $attendance): bool
    {
        return $user->isTeacher() && $attendance->timetable->teacher_id === $user->id;
    }

    public function delete(User $user, Attendance $attendance): bool
    {
        return $this->update($user, $attendance);
    }
}
