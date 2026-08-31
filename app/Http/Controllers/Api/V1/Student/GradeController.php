<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Services\GradebookService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function __construct(private GradebookService $gradebook) {}

    public function index(Request $request): JsonResponse
    {
        return ApiResponse::success($this->gradebook->studentTranscript($request->user()));
    }
}
