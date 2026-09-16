<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Submission;
use App\Services\FileStorageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AssignmentController extends Controller
{
    public function __construct(private FileStorageService $files) {}

    public function index(Request $request): JsonResponse
    {
        $teacherId = $request->user()->id;

        $assignments = Assignment::query()
            ->with(['course.cohort'])
            ->withCount('submissions')
            ->where(function ($query) use ($teacherId) {
                $query->where('teacher_id', $teacherId)
                    ->orWhereHas('course', function ($c) use ($teacherId) {
                        $c->where('teacher_id', $teacherId)
                            ->orWhereHas('timetables', fn ($t) => $t->where('teacher_id', $teacherId));
                    });
            })
            ->when($request->integer('cohort_id'), function ($q, $cohortId) {
                $q->whereHas('course', fn ($c) => $c->where('cohort_id', $cohortId));
            })
            ->when($request->integer('course_id'), fn ($q, $id) => $q->where('course_id', $id))
            ->latest('due_at')
            ->get()
            ->map(function (Assignment $assignment) {
                $assignment->has_attachment = (bool) $assignment->attachment_path;
                $assignment->attachment_url = $assignment->attachment_path
                    ? "/api/v1/teacher/assignments/{$assignment->id}/download"
                    : null;

                return $assignment;
            });

        return ApiResponse::success($assignments);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cohort_id' => ['nullable', 'exists:cohorts,id'],
            'course_id' => ['required', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:1000'],
            'due_at' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date'],
            'is_published' => ['sometimes', 'boolean'],
            'allow_late' => ['sometimes', 'boolean'],
            'attachment' => ['nullable', 'file', 'max:'.config('sms.assignment_max_kilobytes', 10240)],
        ]);

        $course = Course::query()->findOrFail($data['course_id']);
        Gate::authorize('instruct', $course);

        if (! empty($data['cohort_id']) && (int) $course->cohort_id !== (int) $data['cohort_id']) {
            throw ValidationException::withMessages([
                'course_id' => ['The selected course does not belong to the active operating cohort.'],
            ]);
        }

        $path = null;
        if ($request->hasFile('attachment')) {
            $path = $this->files->storeAssignmentFile($request->file('attachment'), 'prompts/'.$course->id);
        }

        $assignment = Assignment::query()->create([
            'teacher_id' => $request->user()->id,
            'course_id' => $course->id,
            'title' => $data['title'],
            'instructions' => $data['instructions'] ?? $data['description'] ?? null,
            'max_score' => $data['max_score'],
            'due_at' => $data['due_at'] ?? $data['due_date'] ?? now()->addDays(7),
            'is_published' => $data['is_published'] ?? true,
            'allow_late' => $data['allow_late'] ?? false,
            'attachment_path' => $path,
        ]);

        $assignment->has_attachment = (bool) $assignment->attachment_path;
        $assignment->attachment_url = $assignment->attachment_path
            ? "/api/v1/teacher/assignments/{$assignment->id}/download"
            : null;

        return ApiResponse::success($assignment->load(['course.cohort']), 'Assignment created.', 201);
    }

    public function show(Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        $assignment->load(['course.cohort', 'submissions.student']);
        $assignment->has_attachment = (bool) $assignment->attachment_path;
        $assignment->attachment_url = $assignment->attachment_path
            ? "/api/v1/teacher/assignments/{$assignment->id}/download"
            : null;

        return ApiResponse::success($assignment);
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'max_score' => ['sometimes', 'numeric', 'min:1', 'max:1000'],
            'due_at' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date'],
            'is_published' => ['sometimes', 'boolean'],
            'allow_late' => ['sometimes', 'boolean'],
            'attachment' => ['nullable', 'file', 'max:'.config('sms.assignment_max_kilobytes', 10240)],
        ]);

        if (isset($data['description']) && ! isset($data['instructions'])) {
            $data['instructions'] = $data['description'];
        }
        if (isset($data['due_date']) && ! isset($data['due_at'])) {
            $data['due_at'] = $data['due_date'];
        }

        if ($request->hasFile('attachment')) {
            if ($assignment->attachment_path && Storage::disk('assignments')->exists($assignment->attachment_path)) {
                Storage::disk('assignments')->delete($assignment->attachment_path);
            }
            $data['attachment_path'] = $this->files->storeAssignmentFile(
                $request->file('attachment'),
                'prompts/'.$assignment->course_id
            );
        }

        unset($data['attachment'], $data['description'], $data['due_date']);
        $assignment->update($data);

        return ApiResponse::success($assignment->fresh(['course.cohort']), 'Assignment updated.');
    }

    public function destroy(Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        if ($assignment->attachment_path && Storage::disk('assignments')->exists($assignment->attachment_path)) {
            Storage::disk('assignments')->delete($assignment->attachment_path);
        }

        $assignment->submissions()->delete();
        $assignment->delete();

        return ApiResponse::success(null, 'Assignment deleted.');
    }

    /**
     * Download the assignment attachment prompt file.
     */
    public function downloadAttachment(Request $request, Assignment $assignment)
    {
        $path = $assignment->attachment_path;

        abort_unless($path, 404, 'No file attached to this assignment.');

        // 1. Direct assignments disk check
        if (Storage::disk('assignments')->exists($path)) {
            return Storage::disk('assignments')->download($path);
        }

        // 2. Absolute filesystem path resolution
        $fullPath = storage_path('app/assignments/'.ltrim($path, '/'));
        if (file_exists($fullPath)) {
            return response()->download($fullPath);
        }

        // 3. Check default local disk
        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->download($path);
        }

        abort(404, 'File not found on storage disk.');
    }

    /**
     * Get all submissions for this assignment.
     */
    public function submissions(Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        $submissions = $assignment->submissions()
            ->with(['student'])
            ->latest('submitted_at')
            ->get()
            ->map(function (Submission $sub) {
                return [
                    'id' => $sub->id,
                    'student' => $sub->student,
                    'submission_text' => $sub->text_entry,
                    'file_path' => $sub->file_url,
                    'submitted_at' => $sub->submitted_at,
                    'score' => $sub->score,
                    'grade' => $sub->score,
                    'feedback' => $sub->feedback,
                    'grades_published' => $sub->grades_published,
                    'is_late' => $sub->is_late,
                ];
            });

        return ApiResponse::success($submissions);
    }

    /**
     * Grade a specific student submission.
     */
    public function gradeSubmission(Request $request, Submission $submission): JsonResponse
    {
        $this->authorize('update', $submission->assignment);

        $data = $request->validate([
            'score' => ['required', 'numeric', 'min:0', 'max:'.($submission->assignment->max_score ?? 1000)],
            'feedback' => ['nullable', 'string'],
            'grades_published' => ['sometimes', 'boolean'],
        ]);

        $submission->update([
            'score' => $data['score'],
            'feedback' => $data['feedback'] ?? null,
            'graded_at' => now(),
            'grades_published' => $data['grades_published'] ?? true,
        ]);

        return ApiResponse::success($submission, 'Grade recorded successfully.');
    }
}
