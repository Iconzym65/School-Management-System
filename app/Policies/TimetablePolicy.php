<?php

namespace App\Policies;

use App\Models\Timetable;
use App\Models\User;

class TimetablePolicy
{
    public function instruct(User $user, Timetable $timetable): bool
    {
        return $user->isAdmin() || $timetable->teacher_id === $user->id;
    }

    public function viewMeetingLink(User $user, Timetable $timetable): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $timetable->teacher_id === $user->id;
        }

        return $user->isStudent()
            && $timetable->course->enrollments()->where('student_id', $user->id)->exists();
    }
}
