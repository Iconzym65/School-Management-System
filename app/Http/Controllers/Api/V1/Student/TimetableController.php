<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Timetable;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TimetableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $courseIds = $this->enrolledCourseIds($request->user()->id);

        $slots = Timetable::query()
            ->with('course')
            ->whereIn('course_id', $courseIds)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(fn (Timetable $slot) => $this->present($slot, includeLink: false));

        return ApiResponse::success($slots);
    }

    public function join(Request $request, Timetable $timetable): JsonResponse
    {
        Gate::authorize('viewMeetingLink', $timetable);

        if (! $timetable->meetingIsOpenAt(now())) {
            return ApiResponse::error(
                'The virtual class link is only available 10 minutes before the scheduled start and during the class window.',
                403,
                'MEETING_NOT_OPEN',
            );
        }

        return ApiResponse::success([
            'meeting_link' => $timetable->meeting_link,
            'opens_at' => $timetable->sessionStartOnDate(now()->toDateString())
                ->subMinutes($timetable->meeting_opens_minutes_before),
            'ends_at' => $timetable->sessionEndOnDate(now()->toDateString()),
        ]);
    }

    private function enrolledCourseIds(int $studentId)
    {
        return Enrollment::query()
            ->where('student_id', $studentId)
            ->where('status', EnrollmentStatus::Enrolled)
            ->pluck('course_id');
    }

    private function present(Timetable $slot, bool $includeLink): array
    {
        $open = $slot->meetingIsOpenAt(now());

        return [
            'id' => $slot->id,
            'course' => $slot->course,
            'day_of_week' => $slot->day_of_week,
            'start_time' => $slot->start_time,
            'end_time' => $slot->end_time,
            'classroom' => $slot->classroom,
            'delivery_mode' => $slot->delivery_mode,
            'meeting_open' => $open,
            'meeting_link' => ($includeLink && $open) ? $slot->meeting_link : null,
        ];
    }
}
