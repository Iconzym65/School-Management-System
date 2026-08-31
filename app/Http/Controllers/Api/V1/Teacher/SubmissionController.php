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

class SubmissionController extends Controller
{
    public function index(Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        return ApiResponse::success($assignment->submissions()->with('student')->latest('submitted_at')->get());
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

        $data = $request->validate([
            'score' => ['required', 'numeric', 'min:0', 'lte:'.$submission->assignment->max_score],
            'feedback' => ['nullable', 'string'],
            'grades_published' => ['sometimes', 'boolean'],
        ]);

        $submission->update([
            ...$data,
            'graded_at' => now(),
        ]);

        return ApiResponse::success($submission->fresh('student'), 'Submission graded.');
    }

    public function publish(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

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
