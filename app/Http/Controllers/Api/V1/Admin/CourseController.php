<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Timetable;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Course::query()
            ->with(['cohort', 'timetables.teacher'])
            ->withCount([
                'enrollments as enrolled_students_count' => fn ($q) => $q->where('status', EnrollmentStatus::Enrolled),
            ])
            ->when($request->integer('cohort_id'), fn ($q, $id) => $q->where('cohort_id', $id))
            ->orderBy('code');

        $courses = $request->boolean('all') ? $query->get() : $query->paginate(30);

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
            'teacher_id' => ['nullable', 'exists:users,id'],
        ]);

        $course = DB::transaction(function () use ($data) {
            $teacherId = $data['teacher_id'] ?? null;
            unset($data['teacher_id']);

            $course = Course::query()->create($data);

            // If a teacher is designated upon course creation, ensure a timetable slot exists
            if ($teacherId) {
                Timetable::query()->create([
                    'course_id' => $course->id,
                    'teacher_id' => $teacherId,
                    'day_of_week' => 'MONDAY',
                    'start_time' => '09:00',
                    'end_time' => '10:30',
                    'classroom' => 'Virtual Studio Alpha',
                    'delivery_mode' => 'VIRTUAL',
                    'virtual_platform' => 'zoom',
                ]);
            }

            return $course;
        });

        return ApiResponse::success(
            $course->load(['cohort', 'timetables.teacher']),
            'Course created.',
            201
        );
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
            'teacher_id' => ['nullable', 'exists:users,id'],
        ]);

        DB::transaction(function () use ($request, $course, $data) {
            if ($request->has('teacher_id')) {
                $teacherId = $data['teacher_id'] ?? null;
                unset($data['teacher_id']);

                if ($teacherId) {

                    $timetable = $course->timetables()->first();
                    if ($timetable) {
                        $timetable->update(['teacher_id' => $teacherId]);
                    } else {
                        $course->timetables()->create([
                            'teacher_id' => $teacherId,
                            'day_of_week' => 'MONDAY',
                            'start_time' => '09:00',
                            'end_time' => '10:30',
                            'classroom' => 'Virtual Studio Alpha',
                            'delivery_mode' => 'VIRTUAL',
                            'virtual_platform' => 'zoom',
                        ]);
                    }
                }
            }

            $course->update($data);
        });

        return ApiResponse::success($course->fresh(['cohort', 'timetables.teacher']), 'Course updated.');
    }

    public function destroy(Course $course): JsonResponse
    {
        DB::transaction(function () use ($course) {
            $course->enrollments()->delete();
            $course->timetables()->delete();
            $course->delete();
        });

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
            ['status' => $data['status'] ?? EnrollmentStatus::Enrolled]
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
