<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cohortId = $request->integer('cohort_id');

        // 1. Resolve manual enrollments for this student
        $enrollmentQuery = Enrollment::query()
            ->where('student_id', $user->id)
            ->where(function ($q) {
                $q->where('status', EnrollmentStatus::Enrolled)
                    ->orWhere('status', 'ENROLLED')
                    ->orWhere('status', 'enrolled');
            });

        // 2. Only filter down by cohort if the student has subjects in that batch
        if ($cohortId) {
            $hasInCohort = (clone $enrollmentQuery)
                ->whereHas('course', fn ($c) => $c->where('cohort_id', $cohortId))
                ->exists();

            if ($hasInCohort) {
                $enrollmentQuery->whereHas('course', fn ($c) => $c->where('cohort_id', $cohortId));
            }
        }

        $courseIds = $enrollmentQuery->pluck('course_id');

        // 3. Fallback to student cohort if manual enrollments are not present
        if ($courseIds->isEmpty()) {
            $effectiveCohort = $cohortId ?: $user->cohort_id;
            if ($effectiveCohort) {
                $courseIds = Course::where('cohort_id', $effectiveCohort)->pluck('id');
            }
        }

        $courses = Course::query()
            ->with(['cohort', 'timetables.teacher'])
            ->whereIn('id', $courseIds)
            ->orderBy('code')
            ->get();

        return ApiResponse::success($courses);
    }
}
