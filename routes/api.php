<?php

use App\Http\Controllers\Api\V1\Admin\AttendanceOverrideController;
use App\Http\Controllers\Api\V1\Admin\CohortController;
use App\Http\Controllers\Api\V1\Admin\CourseController as AdminCourseController;
use App\Http\Controllers\Api\V1\Admin\GradebookController as AdminGradebookController;
use App\Http\Controllers\Api\V1\Admin\SettingController;
use App\Http\Controllers\Api\V1\Admin\StudentApprovalController;
use App\Http\Controllers\Api\V1\Admin\StudentController as AdminStudentController;
use App\Http\Controllers\Api\V1\Admin\TeacherController as AdminTeacherController;
use App\Http\Controllers\Api\V1\Admin\TimetableController as AdminTimetableController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Public\RegistrationController;
use App\Http\Controllers\Api\V1\Student\AssignmentController as StudentAssignmentController;
use App\Http\Controllers\Api\V1\Student\AttendanceController as StudentAttendanceController;
use App\Http\Controllers\Api\V1\Student\CourseController as StudentCourseController;
use App\Http\Controllers\Api\V1\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\V1\Student\GradeController as StudentGradeController;
use App\Http\Controllers\Api\V1\Student\ProfileController as StudentProfileController;
use App\Http\Controllers\Api\V1\Student\TimetableController as StudentTimetableController;
use App\Http\Controllers\Api\V1\Teacher\AssignmentController as TeacherAssignmentController;
use App\Http\Controllers\Api\V1\Teacher\AttendanceController as TeacherAttendanceController;
use App\Http\Controllers\Api\V1\Teacher\CourseController as TeacherCourseController;
use App\Http\Controllers\Api\V1\Teacher\DashboardController as TeacherDashboardController;
use App\Http\Controllers\Api\V1\Teacher\GradebookController as TeacherGradebookController;
use App\Http\Controllers\Api\V1\Teacher\StudentController as TeacherStudentController;
use App\Http\Controllers\Api\V1\Teacher\SubmissionController as TeacherSubmissionController;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Timetable;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Public Guest Routes
    Route::prefix('public')->group(function () {
        Route::get('active-cohort', [RegistrationController::class, 'getActiveCohort']);
        Route::get('courses', [RegistrationController::class, 'getCourses']);
        Route::post('student/register', [RegistrationController::class, 'register'])->middleware('throttle:5,1');
    });

    // Authentication Routes
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

        // Password Recovery Endpoints
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

        Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
        Route::get('google/callback', [AuthController::class, 'googleCallback']);
        Route::post('google', [AuthController::class, 'googleToken'])->middleware('throttle:10,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('password', [AuthController::class, 'changePassword']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    // Protected API Groups
    Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {

        // 1. Admin Endpoints
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('teachers', [AdminTeacherController::class, 'index']);
            Route::post('teachers', [AdminTeacherController::class, 'store']);
            Route::get('teachers/{teacher}', [AdminTeacherController::class, 'show']);
            Route::put('teachers/{teacher}', [AdminTeacherController::class, 'update']);
            Route::delete('teachers/{teacher}', [AdminTeacherController::class, 'destroy']);

            Route::get('students', [AdminStudentController::class, 'index']);
            Route::post('students', [AdminStudentController::class, 'store']);
            Route::get('students/{student}', [AdminStudentController::class, 'show']);
            Route::put('students/{student}', [AdminStudentController::class, 'update']);
            Route::delete('students/{student}', [AdminStudentController::class, 'destroy']);
            Route::patch('students/{student}/status', [AdminStudentController::class, 'updateStatus']);
            Route::get('students/{student}/transcript', [AdminGradebookController::class, 'student']);

            Route::get('student-applications', [StudentApprovalController::class, 'index']);
            Route::post('student-applications/{application}/approve', [StudentApprovalController::class, 'approve']);
            Route::post('student-applications/{application}/reject', [StudentApprovalController::class, 'reject']);

            Route::apiResource('cohorts', CohortController::class);

            Route::get('courses', [AdminCourseController::class, 'index']);
            Route::post('courses', [AdminCourseController::class, 'store']);
            Route::get('courses/{course}', [AdminCourseController::class, 'show']);
            Route::put('courses/{course}', [AdminCourseController::class, 'update']);
            Route::delete('courses/{course}', [AdminCourseController::class, 'destroy']);
            Route::post('courses/{course}/enrollments', [AdminCourseController::class, 'enroll']);
            Route::delete('courses/{course}/enrollments/{student}', [AdminCourseController::class, 'unenroll']);
            Route::get('courses/{course}/gradebook', [AdminGradebookController::class, 'course']);

            Route::get('timetables', [AdminTimetableController::class, 'index']);
            Route::post('timetables', [AdminTimetableController::class, 'store']);
            Route::put('timetables/{timetable}', [AdminTimetableController::class, 'update']);
            Route::patch('timetables/{timetable}/meeting-link', [AdminTimetableController::class, 'updateMeetingLink']);
            Route::delete('timetables/{timetable}', [AdminTimetableController::class, 'destroy']);
            Route::post('timetables/{timetable}/attendance', [AttendanceOverrideController::class, 'store']);

            Route::get('attendance', function (Request $request) {
                $cohortId = $request->query('cohort_id');

                $query = Attendance::query()->latest('session_date')->limit(100);

                if ($cohortId) {
                    $query->where(function ($q) use ($cohortId) {
                        $q->whereHas('timetable.course', fn ($c) => $c->where('cohort_id', $cohortId))
                            ->orWhereHas('student', fn ($s) => $s->where('cohort_id', $cohortId));
                    });
                }

                $logs = $query->get()->map(function ($record) {
                    $student = $record->student ?? User::find($record->student_id);
                    $timetable = $record->timetable ?? Timetable::with('course')->find($record->timetable_id);
                    $course = $timetable?->course ?? ($record->course_id ? Course::find($record->course_id) : null);
                    $markedBy = $record->marked_by ? User::find($record->marked_by)?->name : 'Tutor';

                    return [
                        'id' => $record->id,
                        'session_date' => $record->session_date ? Carbon::parse($record->session_date)->toDateString() : null,
                        'course_code' => $course?->code ?? 'SUB-Auto',
                        'course_title' => $course?->title ?? 'General Subject',
                        'student_name' => $student?->name ?? 'Unknown Student',
                        'student_number' => $student?->student_number ?? 'STU-Auto',
                        'status' => is_object($record->status) && isset($record->status->value)
                            ? $record->status->value
                            : (string) ($record->status ?? 'PRESENT'),
                        'marked_by' => $markedBy,
                        'notes' => $record->notes ?? '—',
                    ];
                });

                return ApiResponse::success($logs);
            });

            Route::get('settings', [SettingController::class, 'index']);
            Route::put('settings', [SettingController::class, 'update']);
        });

        // 2. Teacher Endpoints
        Route::prefix('teacher')->middleware('role:teacher')->group(function () {
            Route::get('dashboard/today', [TeacherDashboardController::class, 'today']);
            Route::get('timetable', [TeacherDashboardController::class, 'timetable']);
            Route::get('courses', [TeacherCourseController::class, 'index']);
            Route::get('courses/{course}', [TeacherCourseController::class, 'show']);
            Route::get('courses/{course}/gradebook', [TeacherGradebookController::class, 'show']);

            Route::get('students', [TeacherStudentController::class, 'index']);
            Route::get('students/{student}', [TeacherStudentController::class, 'show']);

            Route::get('timetables/{timetable}/attendance', [TeacherAttendanceController::class, 'roster']);
            Route::post('timetables/{timetable}/attendance', [TeacherAttendanceController::class, 'store']);

            Route::get('assignments/{assignment}/download', [TeacherAssignmentController::class, 'downloadAttachment'])
                ->name('api.v1.teacher.assignments.download');
            Route::get('assignments/{assignment}/submissions', [TeacherSubmissionController::class, 'index']);
            Route::post('assignments/{assignment}/publish-grades', [TeacherSubmissionController::class, 'publish']);

            Route::apiResource('assignments', TeacherAssignmentController::class);

            Route::get('submissions/{submission}/file', [TeacherSubmissionController::class, 'download']);
            Route::post('submissions/{submission}/grade', [TeacherSubmissionController::class, 'grade']);
        });

        // 3. Student Endpoints
        Route::prefix('student')->middleware('role:student')->group(function () {
            Route::get('dashboard', [StudentDashboardController::class, 'show']);
            Route::get('profile', [StudentProfileController::class, 'show']);
            Route::get('courses', [StudentCourseController::class, 'index']);
            Route::get('timetable', [StudentTimetableController::class, 'index']);
            Route::get('timetables/{timetable}/join', [StudentTimetableController::class, 'join'])->middleware('student.active');

            Route::get('assignments', [StudentAssignmentController::class, 'index']);
            Route::get('assignments/{assignment}/download', [StudentAssignmentController::class, 'downloadAttachment']);
            Route::post('assignments/{assignment}/submit', [StudentAssignmentController::class, 'submit']);

            Route::get('grades', [StudentGradeController::class, 'index']);
            Route::get('attendance', [StudentAttendanceController::class, 'index']);
        });
    });
});
