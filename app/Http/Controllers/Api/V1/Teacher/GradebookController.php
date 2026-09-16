<?php

namespace App\Http\Controllers\Api\V1\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Services\GradebookService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class GradebookController extends Controller
{
    public function __construct(private GradebookService $gradebook) {}

    public function show(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('instruct', $course);

        // Enforce cohort match if an operating cohort filter is supplied
        if ($request->filled('cohort_id')) {
            $cohortId = $request->integer('cohort_id');
            if ((int) $course->cohort_id !== $cohortId) {
                throw ValidationException::withMessages([
                    'cohort_id' => ['The requested course gradebook does not belong to the active operating cohort.'],
                ]);
            }
        }

        $summary = $this->gradebook->courseSummary(
            $course->load(['assignments', 'cohort'])
        );

        return ApiResponse::success($summary);
    }
}
