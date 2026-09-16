<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Submission;
use App\Services\FileStorageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SubmissionController extends Controller
{
    public function __construct(private FileStorageService $files) {}

    public function show(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('view', $assignment);

        $submission = Submission::query()
            ->where('student_id', $request->user()->id)
            ->where('assignment_id', $assignment->id)
            ->first();

        return ApiResponse::success($submission);
    }

    public function store(Request $request, Assignment $assignment): JsonResponse
    {
        $this->authorize('view', $assignment);

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

        return ApiResponse::success($submission, 'Assignment submission recorded successfully.');
    }

    public function downloadMyFile(Request $request, Submission $submission)
    {
        abort_unless((int) $submission->student_id === (int) $request->user()->id, 403, 'Unauthorized.');
        abort_unless($submission->file_url, 404, 'No file associated with this submission.');

        if (Storage::disk('assignments')->exists($submission->file_url)) {
            return Storage::disk('assignments')->download($submission->file_url);
        }

        return redirect()->away($submission->file_url);
    }
}
