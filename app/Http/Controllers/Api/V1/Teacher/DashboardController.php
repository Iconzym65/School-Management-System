<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Enums\DayOfWeek;
use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Timetable;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function timetable(Request $request): JsonResponse
    {
        $teacherId = $request->user()->id;

        $slots = Timetable::query()
            ->with(['course.cohort'])
            ->where('teacher_id', $teacherId)
            // Filter timetable slots strictly by the operating cohort
            ->when($request->integer('cohort_id'), function ($q, $cohortId) {
                $q->whereHas('course', fn ($c) => $c->where('cohort_id', $cohortId));
            })
            ->orderByRaw("CASE day_of_week 
                WHEN 'MONDAY' THEN 0
                WHEN 'TUESDAY' THEN 1
                WHEN 'WEDNESDAY' THEN 2
                WHEN 'THURSDAY' THEN 3
                WHEN 'FRIDAY' THEN 4
                WHEN 'SATURDAY' THEN 5
                WHEN 'SUNDAY' THEN 6
                ELSE 7
            END")
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success($slots);
    }

    public function courses(Request $request): JsonResponse
    {
        $teacherId = $request->user()->id;

        // Fetch courses where the instructor is assigned either directly or via schedule
        $courses = Course::query()
            ->with(['cohort'])
            ->withCount([
                'enrollments as enrolled_students_count' => fn ($q) => $q->where('status', EnrollmentStatus::Enrolled),
            ])
            ->where(function ($q) use ($teacherId) {
                $q->whereHas('timetables', fn ($t) => $t->where('teacher_id', $teacherId));
            })
            // Filter courses strictly by the operating cohort
            ->when($request->integer('cohort_id'), fn ($q, $cohortId) => $q->where('cohort_id', $cohortId))
            ->orderBy('code')
            ->get();

        return ApiResponse::success($courses);
    }

    public function today(Request $request): JsonResponse
    {
        $teacherId = $request->user()->id;
        $day = strtoupper(now()->format('l'));
        $dayEnum = DayOfWeek::tryFrom($day);

        $slots = Timetable::query()
            ->with(['course.cohort'])
            ->where('teacher_id', $teacherId)
            // Filter today's active schedule slots by the operating cohort
            ->when($request->integer('cohort_id'), function ($q, $cohortId) {
                $q->whereHas('course', fn ($c) => $c->where('cohort_id', $cohortId));
            })
            ->when($dayEnum, fn ($q) => $q->where('day_of_week', $dayEnum))
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success($slots);
    }
}
