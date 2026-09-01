<?php

use App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Student;
use App\Http\Controllers\Api\V1\Teacher;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
        Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
        Route::get('google/callback', [AuthController::class, 'googleCallback']);
        Route::post('google', [AuthController::class, 'googleToken'])->middleware('throttle:10,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('password', [AuthController::class, 'changePassword']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('teachers', [Admin\TeacherController::class, 'index']);
            Route::post('teachers', [Admin\TeacherController::class, 'store']);
            Route::get('teachers/{teacher}', [Admin\TeacherController::class, 'show']);
            Route::put('teachers/{teacher}', [Admin\TeacherController::class, 'update']);
            Route::delete('teachers/{teacher}', [Admin\TeacherController::class, 'destroy']);

            Route::get('students', [Admin\StudentController::class, 'index']);
            Route::post('students', [Admin\StudentController::class, 'store']);
            Route::get('students/{student}', [Admin\StudentController::class, 'show']);
            Route::patch('students/{student}/status', [Admin\StudentController::class, 'updateStatus']);
            Route::get('students/{student}/transcript', [Admin\GradebookController::class, 'student']);

            Route::apiResource('cohorts', Admin\CohortController::class);

            Route::get('courses', [Admin\CourseController::class, 'index']);
            Route::post('courses', [Admin\CourseController::class, 'store']);
            Route::get('courses/{course}', [Admin\CourseController::class, 'show']);
            Route::put('courses/{course}', [Admin\CourseController::class, 'update']);
            Route::delete('courses/{course}', [Admin\CourseController::class, 'destroy']);
            Route::post('courses/{course}/enrollments', [Admin\CourseController::class, 'enroll']);
            Route::delete('courses/{course}/enrollments/{student}', [Admin\CourseController::class, 'unenroll']);
            Route::get('courses/{course}/gradebook', [Admin\GradebookController::class, 'course']);

            Route::get('timetables', [Admin\TimetableController::class, 'index']);
            Route::post('timetables', [Admin\TimetableController::class, 'store']);
            Route::put('timetables/{timetable}', [Admin\TimetableController::class, 'update']);
            Route::patch('timetables/{timetable}/meeting-link', [Admin\TimetableController::class, 'updateMeetingLink']);
            Route::delete('timetables/{timetable}', [Admin\TimetableController::class, 'destroy']);
            Route::post('timetables/{timetable}/attendance', [Admin\AttendanceOverrideController::class, 'store']);

            Route::get('attendance-logs', [Admin\AcademicAuditController::class, 'attendance']);
            Route::get('assignment-audits', [Admin\AcademicAuditController::class, 'assignments']);

            Route::get('settings', [Admin\SettingController::class, 'index']);
            Route::put('settings', [Admin\SettingController::class, 'update']);
        });

        Route::prefix('teacher')->middleware('role:teacher')->group(function () {
            Route::get('dashboard/today', [Teacher\DashboardController::class, 'today']);
            Route::get('timetable', [Teacher\DashboardController::class, 'timetable']);
            Route::get('courses', [Teacher\DashboardController::class, 'courses']);
            Route::get('courses/{course}/gradebook', [Teacher\GradebookController::class, 'show']);

            Route::get('timetables/{timetable}/attendance', [Teacher\AttendanceController::class, 'roster']);
            Route::post('timetables/{timetable}/attendance', [Teacher\AttendanceController::class, 'store']);

            Route::get('assignments', [Teacher\AssignmentController::class, 'index']);
            Route::post('assignments', [Teacher\AssignmentController::class, 'store']);
            Route::get('assignments/{assignment}', [Teacher\AssignmentController::class, 'show']);
            Route::put('assignments/{assignment}', [Teacher\AssignmentController::class, 'update']);
            Route::delete('assignments/{assignment}', [Teacher\AssignmentController::class, 'destroy']);

            Route::get('assignments/{assignment}/submissions', [Teacher\SubmissionController::class, 'index']);
            Route::post('assignments/{assignment}/publish-grades', [Teacher\SubmissionController::class, 'publish']);
            Route::get('submissions/{submission}/file', [Teacher\SubmissionController::class, 'download']);
            Route::post('submissions/{submission}/grade', [Teacher\SubmissionController::class, 'grade']);
        });

        Route::prefix('student')->middleware(['role:student', 'student.active'])->group(function () {
            Route::get('dashboard', [Student\DashboardController::class, 'show']);
            Route::get('timetable', [Student\TimetableController::class, 'index']);
            Route::get('timetables/{timetable}/join', [Student\TimetableController::class, 'join']);
            Route::get('assignments', [Student\AssignmentController::class, 'index']);
            Route::post('assignments/{assignment}/submit', [Student\AssignmentController::class, 'submit']);
            Route::get('grades', [Student\GradeController::class, 'index']);
        });
    });
});
