<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRegistrationRequest;
use App\Models\Cohort;
use App\Models\StudentApplication;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class RegistrationController extends Controller
{
    public function getActiveCohort(): JsonResponse
    {
        $cohort = Cohort::query()
            ->where('is_active', true)
            ->with('courses')
            ->latest('starts_on')
            ->first();

        return ApiResponse::success($cohort);
    }

    public function getCourses(): JsonResponse
    {
        $cohort = Cohort::query()
            ->where('is_active', true)
            ->latest('starts_on')
            ->first();

        return ApiResponse::success($cohort?->courses ?? collect());
    }

    public function register(StoreRegistrationRequest $request): JsonResponse
    {

        $activeCohort = Cohort::query()
            ->where('is_active', true)
            ->latest('starts_on')
            ->firstOrFail();

        $data = $request->validated();

        $data['password'] = Hash::make($data['password']);
        $data['cohort_id'] = $activeCohort->id;
        $data['status'] = 'PENDING_APPROVAL';

        unset($data['declaration_confirmed'], $data['privacy_accepted']);

        $application = StudentApplication::query()->create($data);

        return ApiResponse::success([
            'application_id' => $application->id,
            'status' => $application->status,
            'student_email' => $application->student_email,
            'cohort_name' => $activeCohort->name,
            'message' => 'Your application has been received and is pending administrative review.',
        ], 'Application received.', 201);
    }
}
