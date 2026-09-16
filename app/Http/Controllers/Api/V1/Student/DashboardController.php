<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\DayOfWeek;
use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Timetable;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Resolve student course IDs by manual enrollment first
        $courseIds = Enrollment::query()
            ->where('student_id', $user->id)
            ->where(function ($q) {
                $q->where('status', EnrollmentStatus::Enrolled)
                    ->orWhere('status', 'ENROLLED')
                    ->orWhere('status', 'enrolled');
            })
            ->pluck('course_id');

        // Fallback: If no explicit enrollments exist, load courses assigned to the student's cohort
        if ($courseIds->isEmpty() && $user->cohort_id) {
            $courseIds = Course::where('cohort_id', $user->cohort_id)->pluck('id');
        }

        // 2. Fetch courses/subjects with relations
        $courses = Course::query()
            ->with(['cohort', 'timetables.teacher'])
            ->whereIn('id', $courseIds)
            ->orderBy('code')
            ->get();

        $today = DayOfWeek::tryFrom(strtoupper(now()->format('l')));

        // 3. Fetch schedule slots for the enrolled courses
        $todaySchedule = Timetable::query()
            ->with(['course.cohort', 'teacher'])
            ->whereIn('course_id', $courseIds)
            ->when($today, fn ($q) => $q->where('day_of_week', $today))
            ->orderBy('start_time')
            ->get()
            ->map(fn (Timetable $slot) => $this->sanitizeSlot($slot));

        // 4. Fetch upcoming assignments/tasks for these courses
        $deadlines = Assignment::query()
            ->whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->where('due_at', '>=', now())
            ->orderBy('due_at')
            ->limit(10)
            ->get(['id', 'course_id', 'title', 'instructions', 'due_at', 'max_score', 'attachment_path'])
            ->map(function ($a) {
                $hasFile = ! empty($a->attachment_path);
                $a->has_attachment = $hasFile;
                $a->has_prompt_attachment = $hasFile;
                $a->attachment_url = $hasFile ? "/api/v1/student/assignments/{$a->id}/download" : null;

                return $a;
            });

        return ApiResponse::success([
            'cohort_id' => $user->cohort_id,
            'courses' => $courses,
            'today_schedule' => $todaySchedule,
            'upcoming_deadlines' => $deadlines,
        ]);
    }

    private function sanitizeSlot(Timetable $slot): array
    {
        $isOpen = method_exists($slot, 'meetingIsOpenAt')
            ? $slot->meetingIsOpenAt(now())
            : true;

        return [
            'id' => $slot->id,
            'course' => $slot->course,
            'course_code' => $slot->course?->code,
            'course_title' => $slot->course?->title,
            'teacher_name' => $slot->teacher?->name ?? 'Assigned Tutor',
            'day_of_week' => $slot->day_of_week,
            'start_time' => $slot->start_time,
            'end_time' => $slot->end_time,
            'classroom' => $slot->classroom,
            'delivery_mode' => $slot->delivery_mode,
            'virtual_platform' => $slot->virtual_platform ?? 'zoom',
            'meeting_open' => $isOpen,
            'meeting_link' => $isOpen ? $slot->meeting_link : null,
        ];
    }
}
