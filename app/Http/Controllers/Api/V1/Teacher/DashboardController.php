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
            ->orderByRaw("FIELD(day_of_week, 'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY')")
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
            ->with(['department', 'semester'])
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
