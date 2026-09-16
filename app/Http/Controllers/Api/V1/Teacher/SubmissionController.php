<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Submission;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SubmissionController extends Controller
{
    public function index(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        if ($request->filled('cohort_id')) {
            $cohortId = $request->integer('cohort_id');
            if ((int) $assignment->course?->cohort_id !== $cohortId) {
                throw ValidationException::withMessages([
                    'cohort_id' => ['The requested assignment does not belong to the active operating cohort.'],
                ]);
            }
        }

        $submissions = $assignment->submissions()
            ->with(['student.role'])
            ->latest('submitted_at')
            ->get();

        return ApiResponse::success($submissions);
    }

    public function download(Submission $submission)
    {
        $this->authorize('update', $submission->assignment);
        abort_unless($submission->file_url, 404, 'No file attached to this submission.');

        return Storage::disk('assignments')->download($submission->file_url);
    }

    public function grade(Request $request, Submission $submission): JsonResponse
    {
        $this->authorize('update', $submission->assignment);

        if ($request->filled('cohort_id')) {
            $cohortId = $request->integer('cohort_id');
            if ((int) $submission->assignment?->course?->cohort_id !== $cohortId) {
                throw ValidationException::withMessages([
                    'cohort_id' => ['This submission does not belong to the active operating cohort.'],
                ]);
            }
        }

        $data = $request->validate([
            'score' => ['required', 'numeric', 'min:0', 'lte:'.($submission->assignment->max_score ?? 1000)],
            'feedback' => ['nullable', 'string'],
            'grades_published' => ['sometimes', 'boolean'],
        ]);

        $submission->update([
            'score' => $data['score'],
            'feedback' => $data['feedback'] ?? null,
            'graded_at' => now(),
            // Automatically publish the grade so student dashboard picks it up immediately
            'grades_published' => $data['grades_published'] ?? true,
        ]);

        return ApiResponse::success($submission->fresh(['student', 'assignment.course.cohort']), 'Submission graded.');
    }

    public function publish(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        if ($request->filled('cohort_id')) {
            $cohortId = $request->integer('cohort_id');
            if ((int) $assignment->course?->cohort_id !== $cohortId) {
                throw ValidationException::withMessages([
                    'cohort_id' => ['Cannot publish grades for an assignment outside the active operating cohort.'],
                ]);
            }
        }

        $data = $request->validate([
            'grades_published' => ['required', 'boolean'],
        ]);

        DB::transaction(function () use ($assignment, $data) {
            $assignment->submissions()->update([
                'grades_published' => $data['grades_published'],
            ]);
        });

        return ApiResponse::success(null, $data['grades_published'] ? 'Grades published.' : 'Grades unpublished.');
    }
}
