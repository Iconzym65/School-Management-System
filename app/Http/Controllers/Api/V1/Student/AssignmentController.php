<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Services\FileStorageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AssignmentController extends Controller
{
    public function __construct(private FileStorageService $files) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cohortId = $request->integer('cohort_id') ?: $user->cohort_id;

        // 1. Resolve student course IDs via active enrollments or cohort fallback
        $courseIds = Enrollment::query()
            ->where('student_id', $user->id)
            ->where(function ($q) {
                $q->where('status', EnrollmentStatus::Enrolled)
                    ->orWhere('status', 'ENROLLED')
                    ->orWhere('status', 'enrolled');
            })
            ->when($cohortId, function ($q, $cid) {
                $q->whereHas('course', fn ($c) => $c->where('cohort_id', $cid));
            })
            ->pluck('course_id');

        if ($courseIds->isEmpty() && $cohortId) {
            $courseIds = Course::where('cohort_id', $cohortId)->pluck('id');
        }

        // 2. Fetch all published assignments with relationships
        $assignments = Assignment::query()
            ->with(['course.cohort'])
            ->whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->orderBy('due_at')
            ->get();

        $mine = Submission::query()
            ->where('student_id', $user->id)
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->get()
            ->keyBy('assignment_id');

        $payload = $assignments->map(function (Assignment $assignment) use ($mine) {
            $submission = $mine->get($assignment->id);
            $hasFile = ! empty($assignment->attachment_path);

            return [
                'id' => $assignment->id,
                'course' => $assignment->course,
                'course_id' => $assignment->course_id,
                'course_code' => $assignment->course?->code,
                'title' => $assignment->title,
                'instructions' => $assignment->instructions,
                'max_score' => (float) $assignment->max_score,
                'due_at' => $assignment->due_at,
                'allow_late' => (bool) $assignment->allow_late,
                'has_attachment' => $hasFile,
                'has_prompt_attachment' => $hasFile,
                'attachment_path' => $assignment->attachment_path,
                'attachment_url' => $hasFile ? "/api/v1/student/assignments/{$assignment->id}/download" : null,
                'submission' => $submission ? [
                    'id' => $submission->id,
                    'submitted_at' => $submission->submitted_at,
                    'is_late' => (bool) $submission->is_late,
                    'grades_published' => (bool) $submission->grades_published,
                    'score' => $submission->score !== null ? (float) $submission->score : null,
                    'feedback' => $submission->feedback,
                ] : null,
            ];
        });

        return ApiResponse::success($payload);
    }

    public function downloadAttachment(Request $request, $assignment)
    {
        $assignmentModel = $assignment instanceof Assignment
            ? $assignment
            : Assignment::query()->findOrFail((int) $assignment);

        $path = $assignmentModel->attachment_path;

        abort_unless($path, 404, 'No file attached to this assignment.');

        // 1. Direct assignments disk check
        if (Storage::disk('assignments')->exists($path)) {
            return Storage::disk('assignments')->download($path);
        }

        // 2. Direct absolute storage path fallback
        $fullPath = storage_path('app/assignments/'.ltrim($path, '/'));
        if (file_exists($fullPath)) {
            return response()->download($fullPath);
        }

        // 3. Check default local disk
        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->download($path);
        }

        abort(404, 'The attached task brief file could not be found on the storage disk.');
    }

    public function submit(Request $request, Assignment $assignment): JsonResponse
    {
        $data = $request->validate([
            'text_entry' => ['required_without_all:file,attachment_url', 'nullable', 'string'],
            'attachment_url' => ['nullable', 'url'],
            'file' => ['nullable', 'file', 'max:'.config('sms.assignment_max_kilobytes', 10240)],
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
                    'file_url' => $path ?? ($data['attachment_url'] ?? null),
                    'submitted_at' => $now,
                    'is_late' => $isLate,
                ]
            );
        });

        return ApiResponse::success($submission, 'Submission recorded.');
    }
}
