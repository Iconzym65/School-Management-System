<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Timetable;
use App\Services\AttendanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    public function roster(Request $request, Timetable $timetable): JsonResponse
    {
        $this->authorize('instruct', $timetable);

        $sessionDate = $request->validate(['session_date' => ['required', 'date']])['session_date'];

        $students = $timetable->course->enrollments()
            ->where('status', EnrollmentStatus::Enrolled)
            ->with('student')
            ->get()
            ->pluck('student');

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
            'timetable' => $timetable->load('course'),
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
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:users,id'],
            'records.*.status' => ['required', 'in:PRESENT,ABSENT,LATE,EXCUSED'],
            'records.*.notes' => ['nullable', 'string'],
        ]);

        $this->attendance->markForSession(
            $timetable->load('course'),
            Carbon::parse($data['session_date']),
            $request->user(),
            $data['records'],
        );

        return ApiResponse::success(null, 'Attendance saved.');
    }
}
