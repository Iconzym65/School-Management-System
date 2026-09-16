<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();
        $cohortId = $request->integer('cohort_id');

        // 1. Get all courses taught by this teacher (via timetable OR directly assigned)
        $courseIds = Course::query()
            ->where(function ($q) use ($teacher) {
                $q->where('teacher_id', $teacher->id)
                    ->orWhereHas('timetables', fn ($t) => $t->where('teacher_id', $teacher->id));
            })
            ->when($cohortId, fn ($q) => $q->where('cohort_id', $cohortId))
            ->when($request->integer('course_id'), fn ($q, $courseId) => $q->where('id', $courseId))
            ->pluck('id');

        // 2. Fetch students enrolled in these courses
        $studentsQuery = User::query()
            ->where(function ($q) {
                $q->whereHas('role', fn ($r) => $r->where('slug', RoleSlug::Student->value))
                    ->orWhere('role_id', 3); // Fallback to student role ID
            })
            ->whereHas('enrollments', function ($q) use ($courseIds) {
                $q->whereIn('course_id', $courseIds);
            })
            ->with([
                'cohort',
                'enrollments' => function ($q) use ($courseIds) {
                    $q->whereIn('course_id', $courseIds)->with('course');
                },
            ])
            ->when($request->string('search')->toString(), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('student_number', 'like', "%{$search}%");
                });
            })
            ->orderBy('name');

        // Return all matching students so frontend array helpers (unwrapList) render seamlessly
        $students = $studentsQuery->get()->map(function (User $student) {
            return [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'phone' => $student->phone,
                'student_number' => $student->student_number,
                'status' => $student->status,
                'cohort' => $student->cohort,
                'enrollments' => $student->enrollments,
            ];
        });

        return ApiResponse::success($students);
    }

    public function show(Request $request, User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404, 'Student not found.');

        $teacher = $request->user();

        $courseIds = Course::query()
            ->where(function ($q) use ($teacher) {
                $q->where('teacher_id', $teacher->id)
                    ->orWhereHas('timetables', fn ($t) => $t->where('teacher_id', $teacher->id));
            })
            ->pluck('id');

        $isEnrolled = $student->enrollments()
            ->whereIn('course_id', $courseIds)
            ->exists();

        abort_unless($isEnrolled, 403, 'You do not teach this student.');

        $student->load([
            'cohort',
            'enrollments' => fn ($q) => $q->whereIn('course_id', $courseIds)->with('course'),
        ]);

        return ApiResponse::success($student);
    }
}
