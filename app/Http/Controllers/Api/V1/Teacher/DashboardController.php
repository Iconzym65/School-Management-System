<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Enums\DayOfWeek;
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
        $slots = Timetable::query()
            ->with('course')
            ->where('teacher_id', $request->user()->id)
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
        $courseIds = Timetable::query()
            ->where('teacher_id', $request->user()->id)
            ->pluck('course_id')
            ->unique();

        $courses = Course::query()
            ->with(['cohort'])
            ->whereIn('id', $courseIds)
            ->orderBy('code')
            ->get();

        return ApiResponse::success($courses);
    }

    public function today(Request $request): JsonResponse
    {
        $day = strtoupper(now()->format('l'));
        $dayEnum = DayOfWeek::tryFrom($day);

        $slots = Timetable::query()
            ->with('course')
            ->where('teacher_id', $request->user()->id)
            ->when($dayEnum, fn ($q) => $q->where('day_of_week', $dayEnum))
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success($slots);
    }
}
