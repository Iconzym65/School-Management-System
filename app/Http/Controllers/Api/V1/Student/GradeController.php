<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cohortId = $user->cohort_id ?: $request->integer('cohort_id');

        // Fetch courses student is enrolled in or that belong to their active cohort
        $coursesQuery = Course::query()
            ->where(function ($q) use ($user) {
                $q->whereHas('enrollments', fn ($e) => $e->where('student_id', $user->id))
                    ->orWhere('cohort_id', $user->cohort_id);
            })
            ->with([
                'teacher',
                'timetables.teacher',
                'assignments' => function ($q) use ($user) {
                    $q->where('is_published', true)
                        ->with(['submissions' => fn ($s) => $s->where('student_id', $user->id)]);
                },
            ]);

        if ($cohortId) {
            $coursesQuery->where('cohort_id', $cohortId);
        }

        $courses = $coursesQuery->orderBy('title')->get();

        $courseSummaries = $courses->map(function ($course) {
            $teacherName = $course->teacher?->name
                ?? $course->timetables->first()?->teacher?->name
                ?? 'Assigned Tutor';

            $totalEarned = 0;
            $totalPossible = 0;
            $hasGraded = false;

            foreach ($course->assignments as $assignment) {
                $submission = $assignment->submissions->first();

                // Accumulate only graded scores
                if ($submission && $submission->score !== null) {
                    $totalEarned += (float) $submission->score;
                    $totalPossible += (float) ($assignment->max_score ?: 100);
                    $hasGraded = true;
                }
            }

            $percentage = ($hasGraded && $totalPossible > 0)
                ? round(($totalEarned / $totalPossible) * 100, 1)
                : null;

            $gpaPoints = null;
            if ($percentage !== null) {
                if ($percentage >= 80) {
                    $gpaPoints = 4.0;
                } elseif ($percentage >= 70) {
                    $gpaPoints = 3.0;
                } elseif ($percentage >= 60) {
                    $gpaPoints = 2.0;
                } elseif ($percentage >= 50) {
                    $gpaPoints = 1.0;
                } else {
                    $gpaPoints = 0.0;
                }
            }

            return [
                'course_id' => $course->id,
                'title' => $course->title,
                'code' => $course->code,
                'teacher_name' => $teacherName,
                'percent' => $percentage,
                'gpa_points' => $gpaPoints,
                'grade' => $percentage !== null ? "{$percentage}%" : 'Pending',
            ];
        });

        $validPercentages = $courseSummaries->whereNotNull('percent');
        $averagePercentage = $validPercentages->count() > 0
            ? round($validPercentages->avg('percent'), 1)
            : null;

        return ApiResponse::success([
            'courses' => $courseSummaries->values()->all(),
            'cumulative_gpa' => $validPercentages->count() > 0
                ? round($validPercentages->avg('gpa_points'), 2)
                : null,
            'average_percentage' => $averagePercentage !== null ? "{$averagePercentage}%" : 'N/A',
        ]);
    }
}
