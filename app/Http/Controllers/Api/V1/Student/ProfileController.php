<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['cohort', 'enrollments.course.cohort']);

        return ApiResponse::success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'student_number' => $user->student_number,
            'status' => $user->status instanceof \BackedEnum ? $user->status->value : (string) $user->status,
            'cohort_id' => $user->cohort_id,
            'cohort' => $user->cohort,
            'enrollments' => $user->enrollments,
        ]);
    }
}
