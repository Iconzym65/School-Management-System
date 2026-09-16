<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrollmentStatus;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Timetable;
use App\Services\AttendanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class AttendanceOverrideController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    public function store(Request $request, Timetable $timetable): JsonResponse
    {
        $user = $request->user();

        // Allow Admins to override across the board, or teachers assigned to this slot
        $isAdmin = $user->hasRole(RoleSlug::Admin->value) || method_exists($user, 'isAdmin') && $user->isAdmin();
        $isAssignedTeacher = ($user->isTeacher() && $timetable->teacher_id === $user->id);

        abort_unless($isAdmin || $isAssignedTeacher, 403, 'Unauthorized to override attendance for this session.');

        $data = $request->validate([
            'cohort_id' => ['nullable', 'exists:cohorts,id'],
            'session_date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:users,id'],
            'records.*.status' => ['required', 'in:PRESENT,ABSENT,LATE,EXCUSED'],
            'records.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $timetable->load('course.cohort');

        // Cohort Firewall: Ensure the slot belongs to the target cohort if specified
        if (! empty($data['cohort_id']) && (int) $timetable->course?->cohort_id !== (int) $data['cohort_id']) {
            throw ValidationException::withMessages([
                'cohort_id' => ['The selected timetable slot does not belong to the active operating cohort.'],
            ]);
        }

        // Verify that submitted students belong to the course/cohort roster
        $studentIds = collect($data['records'])->pluck('student_id')->unique();
        $validEnrollmentsCount = Enrollment::query()
            ->where('course_id', $timetable->course_id)
            ->whereIn('student_id', $studentIds)
            ->where('status', EnrollmentStatus::Enrolled)
            ->count();

        if ($validEnrollmentsCount !== $studentIds->count()) {
            throw ValidationException::withMessages([
                'records' => ['One or more students are not actively enrolled in this cohort course.'],
            ]);
        }

        $this->attendance->markForSession(
            $timetable,
            Carbon::parse($data['session_date']),
            $user,
            $data['records'],
            overrideWindow: true,
        );

        return ApiResponse::success(null, 'Attendance overridden successfully.');
    }
}
