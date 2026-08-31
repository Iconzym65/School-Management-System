<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    public function view(User $user, Course $course): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $course->timetables()->where('teacher_id', $user->id)->exists();
        }

        return $course->enrollments()->where('student_id', $user->id)->exists();
    }

    public function instruct(User $user, Course $course): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isTeacher()
            && $course->timetables()->where('teacher_id', $user->id)->exists();
    }
}
