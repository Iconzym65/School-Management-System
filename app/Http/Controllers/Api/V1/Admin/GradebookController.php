<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\User;
use App\Services\GradebookService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class GradebookController extends Controller
{
    public function __construct(private GradebookService $gradebook) {}

    public function course(Course $course): JsonResponse
    {
        return ApiResponse::success($this->gradebook->courseSummary($course->load('assignments')));
    }

    public function student(User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        return ApiResponse::success($this->gradebook->studentTranscript($student));
    }
}
