<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Services\GradebookService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class GradebookController extends Controller
{
    public function __construct(private GradebookService $gradebook) {}

    public function show(Course $course): JsonResponse
    {
        Gate::authorize('instruct', $course);

        return ApiResponse::success($this->gradebook->courseSummary($course->load('assignments')));
    }
}
