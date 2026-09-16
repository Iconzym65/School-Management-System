<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Timetable;
use App\Models\User;
use App\Services\AttendanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    public function roster(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorize('instruct', $timetable);

        $sessionDate = $request->validate([
            'session_date' => ['required', 'date'],
            'cohort_id' => ['nullable', 'exists:cohorts,id'],
        ])['session_date'];

        $timetable->load(['course.cohort']);

        // Enforce cohort match if an operating cohort filter is provided
        if ($request->filled('cohort_id')) {
            $cohortId = $request->integer('cohort_id');
            if ((int) $timetable->course?->cohort_id !== $cohortId) {
                throw ValidationException::withMessages([
                    'cohort_id' => ['The selected timetable slot does not belong to the active operating cohort.'],
                ]);
            }
        }

        // Fetch students actively enrolled in the course for this specific cohort term
        $students = User::query()
            ->whereHas('enrollments', function ($query) use ($timetable) {
                $query->where('course_id', $timetable->course_id)
                    ->where('status', EnrollmentStatus::Enrolled);
            })
            ->select('id', 'name', 'email', 'student_number')
            ->orderBy('name')
            ->get();

        $existing = Attendance::query()
            ->where('timetable_id', $timetable->id)
            ->whereDate('session_date', $sessionDate)
            ->get()
            ->keyBy('student_id');

        $rows = $students->map(fn ($student) => [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'student_number' => $student->student_number,
            ],
            'attendance' => $existing->get($student->id),
        ]);

        return ApiResponse::success([
            'timetable' => [
                'id' => $timetable->id,
                'course_id' => $timetable->course_id,
                'course_code' => $timetable->course?->code,
                'course_title' => $timetable->course?->title,
                'cohort_code' => $timetable->course?->cohort?->code,
                'day_of_week' => $timetable->day_of_week,
                'start_time' => $timetable->start_time,
                'end_time' => $timetable->end_time,
            ],
            'session_date' => $sessionDate,
            'edit_window_hours' => $this->attendance->editWindowHours(),
            'roster' => $rows,
        ]);
    }

    public function store(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorize('instruct', $timetable);

        $data = $request->validate([
            'session_date' => ['required', 'date'],
            'cohort_id' => ['nullable', 'exists:cohorts,id'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:users,id'],
            'records.*.status' => ['required', 'in:PRESENT,ABSENT,LATE,EXCUSED'],
            'records.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $timetable->load('course.cohort');

        // Verify timetable slot matches operating cohort if supplied
        if (! empty($data['cohort_id']) && (int) $timetable->course?->cohort_id !== (int) $data['cohort_id']) {
            throw ValidationException::withMessages([
                'cohort_id' => ['The selected timetable slot does not match the active operating cohort.'],
            ]);
        }

        // Verify that submitted students belong to this course & cohort enrollment
        $submittedStudentIds = collect($data['records'])->pluck('student_id')->unique();
        $validCount = Enrollment::query()
            ->where('course_id', $timetable->course_id)
            ->whereIn('student_id', $submittedStudentIds)
            ->where('status', EnrollmentStatus::Enrolled)
            ->count();

        if ($validCount !== $submittedStudentIds->count()) {
            throw ValidationException::withMessages([
                'records' => ['One or more students in the roster are not actively enrolled in this cohort course.'],
            ]);
        }

        $this->attendance->markForSession(
            $timetable,
            Carbon::parse($data['session_date']),
            $request->user(),
            $data['records']
        );

        return ApiResponse::success(null, 'Attendance saved.');
    }
}
