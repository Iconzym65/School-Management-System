<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Services\FileStorageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssignmentController extends Controller
{
    public function __construct(private FileStorageService $files) {}

    public function index(Request $request): JsonResponse
    {
        $courseIds = Enrollment::query()
            ->where('student_id', $request->user()->id)
            ->where('status', EnrollmentStatus::Enrolled)
            ->pluck('course_id');

        $assignments = Assignment::query()
            ->with('course')
            ->whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->orderBy('due_at')
            ->get();

        $mine = Submission::query()
            ->where('student_id', $request->user()->id)
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->get()
            ->keyBy('assignment_id');

        $payload = $assignments->map(function (Assignment $assignment) use ($mine) {
            $submission = $mine->get($assignment->id);

            return [
                'id' => $assignment->id,
                'course' => $assignment->course,
                'title' => $assignment->title,
                'instructions' => $assignment->instructions,
                'max_score' => $assignment->max_score,
                'due_at' => $assignment->due_at,
                'allow_late' => $assignment->allow_late,
                'has_prompt_attachment' => (bool) $assignment->attachment_path,
                'submission' => $submission ? [
                    'id' => $submission->id,
                    'submitted_at' => $submission->submitted_at,
                    'is_late' => $submission->is_late,
                    'grades_published' => $submission->grades_published,
                    'score' => $submission->grades_published ? $submission->score : null,
                    'feedback' => $submission->grades_published ? $submission->feedback : null,
                ] : null,
            ];
        });

        return ApiResponse::success($payload);
    }

    public function submit(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('view', $assignment);

        $data = $request->validate([
            'text_entry' => ['required_without:file', 'nullable', 'string'],
            'file' => ['required_without:text_entry', 'nullable', 'file', 'max:'.config('sms.assignment_max_kilobytes'), 'mimes:'.implode(',', config('sms.allowed_assignment_mimes'))],
        ]);

        $now = now();
        $isLate = $now->gt($assignment->due_at);

        if ($isLate && ! $assignment->allow_late) {
            return ApiResponse::error('The submission deadline has passed.', 422, 'DEADLINE_PASSED');
        }

        $path = null;
        if ($request->hasFile('file')) {
            $path = $this->files->storeAssignmentFile(
                $request->file('file'),
                'submissions/'.$assignment->id.'/'.$request->user()->id
            );
        }

        $submission = DB::transaction(function () use ($request, $assignment, $data, $path, $now, $isLate) {
            return Submission::query()->updateOrCreate(
                [
                    'student_id' => $request->user()->id,
                    'assignment_id' => $assignment->id,
                ],
                [
                    'text_entry' => $data['text_entry'] ?? null,
                    'file_url' => $path,
                    'submitted_at' => $now,
                    'is_late' => $isLate,
                    'score' => null,
                    'feedback' => null,
                    'graded_at' => null,
                    'grades_published' => false,
                ],
            );
        });

        return ApiResponse::success($submission, 'Submission recorded.');
    }
}
