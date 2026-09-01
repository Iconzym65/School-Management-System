<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\DayOfWeek;
use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Assignment;
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
        $courseIds = Enrollment::query()
            ->where('student_id', $user->id)
            ->where('status', EnrollmentStatus::Enrolled)
            ->pluck('course_id');

        $courses = \App\Models\Course::query()
            ->with(['cohort'])
            ->whereIn('id', $courseIds)
            ->orderBy('code')
            ->get();

        $today = DayOfWeek::tryFrom(strtoupper(now()->format('l')));

        $todaySchedule = Timetable::query()
            ->with('course')
            ->whereIn('course_id', $courseIds)
            ->when($today, fn ($q) => $q->where('day_of_week', $today))
            ->orderBy('start_time')
            ->get()
            ->map(fn (Timetable $slot) => $this->sanitizeSlot($slot, false));

        $deadlines = Assignment::query()
            ->whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->where('due_at', '>=', now())
            ->orderBy('due_at')
            ->limit(10)
            ->get(['id', 'course_id', 'title', 'due_at', 'max_score']);

        return ApiResponse::success([
            'courses' => $courses,
            'today_schedule' => $todaySchedule,
            'upcoming_deadlines' => $deadlines,
        ]);
    }

    private function sanitizeSlot(Timetable $slot, bool $includeLink): array
    {
        return [
            'id' => $slot->id,
            'course' => $slot->course,
            'day_of_week' => $slot->day_of_week,
            'start_time' => $slot->start_time,
            'end_time' => $slot->end_time,
            'classroom' => $slot->classroom,
            'delivery_mode' => $slot->delivery_mode,
            'meeting_link' => $includeLink ? $slot->meeting_link : null,
            'meeting_open' => $includeLink,
        ];
    }
}
