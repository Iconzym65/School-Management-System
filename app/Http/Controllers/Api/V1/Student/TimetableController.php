<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Timetable;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimetableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cohortId = $request->integer('cohort_id') ?: $user->cohort_id;

        $courseIds = Enrollment::query()
            ->where('student_id', $user->id)
            ->where(function ($q) {
                $q->where('status', EnrollmentStatus::Enrolled)
                    ->orWhere('status', 'ENROLLED')
                    ->orWhere('status', 'enrolled');
            })
            ->pluck('course_id');

        if ($courseIds->isEmpty() && $cohortId) {
            $courseIds = Course::where('cohort_id', $cohortId)->pluck('id');
        }

        $slots = Timetable::query()
            ->with(['course.cohort', 'teacher'])
            ->whereIn('course_id', $courseIds)
            ->orderBy('start_time')
            ->get()
            ->map(function (Timetable $slot) {
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
                    'meeting_link' => $slot->meeting_link, // Expose link to student
                ];
            });

        return ApiResponse::success($slots);
    }

    public function join(Timetable $timetable): JsonResponse
    {
        return ApiResponse::success([
            'meeting_link' => $timetable->meeting_link,
        ]);
    }
}
