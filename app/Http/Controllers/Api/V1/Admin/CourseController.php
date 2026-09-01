<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrollmentStatus;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $courses = Course::query()
            ->with(['cohort', 'timetables.teacher'])
            ->withCount([
                'enrollments as enrolled_students_count' => fn ($q) => $q->where('status', EnrollmentStatus::Enrolled),
            ])
            ->when($request->integer('cohort_id'), fn ($q, $id) => $q->where('cohort_id', $id))
            ->orderBy('code')
            ->paginate(30);

        return ApiResponse::success($courses);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cohort_id' => ['required', 'exists:cohorts,id'],
            'code' => ['required', 'string', 'max:32', 'unique:courses,code'],
            'title' => ['required', 'string', 'max:255'],
            'credit_hours' => ['required', 'integer', 'min:1', 'max:12'],
            'description' => ['nullable', 'string'],
        ]);

        return ApiResponse::success(Course::query()->create($data)->load(['cohort']), 'Course created.', 201);
    }

    public function show(Course $course): JsonResponse
    {
        return ApiResponse::success(
            $course->load(['cohort', 'timetables.teacher', 'enrollments.student'])
        );
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'cohort_id' => ['sometimes', 'exists:cohorts,id'],
            'code' => ['sometimes', 'string', 'max:32', Rule::unique('courses', 'code')->ignore($course->id)],
            'title' => ['sometimes', 'string', 'max:255'],
            'credit_hours' => ['sometimes', 'integer', 'min:1', 'max:12'],
            'description' => ['nullable', 'string'],
        ]);

        $course->update($data);

        return ApiResponse::success($course->fresh(['cohort']), 'Course updated.');
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return ApiResponse::success(null, 'Course deleted.');
    }

    public function enroll(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:users,id'],
            'status' => ['sometimes', Rule::enum(EnrollmentStatus::class)],
        ]);

        $student = User::query()->findOrFail($data['student_id']);
        abort_unless($student->isStudent(), 422, 'Only student accounts can be enrolled.');

        $enrollment = Enrollment::query()->updateOrCreate(
            ['student_id' => $student->id, 'course_id' => $course->id],
            ['status' => $data['status'] ?? EnrollmentStatus::Enrolled],
        );

        return ApiResponse::success($enrollment->load('student'), 'Enrollment saved.');
    }

    public function unenroll(Course $course, User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        Enrollment::query()
            ->where('course_id', $course->id)
            ->where('student_id', $student->id)
            ->update(['status' => EnrollmentStatus::Dropped]);

        return ApiResponse::success(null, 'Student dropped from course.');
    }
}
