<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Course;
use App\Services\FileStorageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AssignmentController extends Controller
{
    public function __construct(private FileStorageService $files) {}

    public function index(Request $request): JsonResponse
    {
        $assignments = Assignment::query()
            ->with('course')
            ->where('teacher_id', $request->user()->id)
            ->when($request->integer('course_id'), fn ($q, $id) => $q->where('course_id', $id))
            ->latest('due_at')
            ->get();

        return ApiResponse::success($assignments);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:1000'],
            'due_at' => ['required', 'date', 'after:now'],
            'is_published' => ['sometimes', 'boolean'],
            'allow_late' => ['sometimes', 'boolean'],
            'attachment' => ['nullable', 'file', 'max:'.config('sms.assignment_max_kilobytes'), 'mimes:'.implode(',', config('sms.allowed_assignment_mimes'))],
        ]);

        $course = Course::query()->findOrFail($data['course_id']);
        Gate::authorize('instruct', $course);

        $path = null;
        if ($request->hasFile('attachment')) {
            $path = $this->files->storeAssignmentFile($request->file('attachment'), 'prompts/'.$course->id);
        }

        $assignment = Assignment::query()->create([
            'teacher_id' => $request->user()->id,
            'course_id' => $course->id,
            'title' => $data['title'],
            'instructions' => $data['instructions'] ?? null,
            'max_score' => $data['max_score'],
            'due_at' => $data['due_at'],
            'is_published' => $data['is_published'] ?? false,
            'allow_late' => $data['allow_late'] ?? false,
            'attachment_path' => $path,
        ]);

        return ApiResponse::success($assignment->load('course'), 'Assignment created.', 201);
    }

    public function show(Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        return ApiResponse::success($assignment->load(['course', 'submissions.student']));
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'max_score' => ['sometimes', 'numeric', 'min:1', 'max:1000'],
            'due_at' => ['sometimes', 'date'],
            'is_published' => ['sometimes', 'boolean'],
            'allow_late' => ['sometimes', 'boolean'],
            'attachment' => ['nullable', 'file', 'max:'.config('sms.assignment_max_kilobytes'), 'mimes:'.implode(',', config('sms.allowed_assignment_mimes'))],
        ]);

        if ($request->hasFile('attachment')) {
            if ($assignment->attachment_path) {
                Storage::disk('assignments')->delete($assignment->attachment_path);
            }
            $data['attachment_path'] = $this->files->storeAssignmentFile(
                $request->file('attachment'),
                'prompts/'.$assignment->course_id
            );
        }

        unset($data['attachment']);
        $assignment->update($data);

        return ApiResponse::success($assignment->fresh('course'), 'Assignment updated.');
    }

    public function destroy(Assignment $assignment): JsonResponse
    {
        $this->authorize('update', $assignment);
        $assignment->delete();

        return ApiResponse::success(null, 'Assignment deleted.');
    }
}
