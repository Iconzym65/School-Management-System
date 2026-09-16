<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();

        $courses = Course::query()
            ->whereHas('timetables', function ($query) use ($teacher) {
                $query->where('teacher_id', $teacher->id);
            })
            ->with([
                'cohort',
                'timetables' => function ($query) use ($teacher) {
                    $query->where('teacher_id', $teacher->id);
                },
            ])
            ->withCount('enrollments')
            ->orderBy('code')
            ->get();

        return ApiResponse::success($courses);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        $teacher = $request->user();

        $isAssigned = $course->timetables()->where('teacher_id', $teacher->id)->exists();
        abort_unless($isAssigned, 403, 'You are not assigned to this course.');

        $course->load([
            'cohort',
            'timetables' => fn ($q) => $q->where('teacher_id', $teacher->id),
            'enrollments.student',
        ]);

        return ApiResponse::success($course);
    }
}
