<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\User;
use App\Services\GradebookService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GradebookController extends Controller
{
    public function __construct(private GradebookService $gradebook) {}

    /**
     * View summary of student grades for a specific course (Read-Only Audit).
     */
    public function course(Request $request, Course $course): JsonResponse
    {
        // Enforce cohort match if an operating cohort is explicitly active
        if ($request->filled('cohort_id')) {
            $cohortId = $request->integer('cohort_id');
            if ((int) $course->cohort_id !== $cohortId) {
                throw ValidationException::withMessages([
                    'cohort_id' => ['The requested course does not belong to the selected operating cohort.'],
                ]);
            }
        }

        $summary = $this->gradebook->courseSummary(
            $course->load(['assignments', 'cohort'])
        );

        return ApiResponse::success($summary);
    }

    /**
     * View cumulative or cohort-scoped academic transcript for a student.
     */
    public function student(Request $request, User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        $cohortId = $request->integer('cohort_id') ?: null;

        $transcript = $cohortId
            ? $this->gradebook->studentTranscriptForCohort($student, $cohortId)
            : $this->gradebook->studentTranscript($student);

        return ApiResponse::success($transcript);
    }
}
