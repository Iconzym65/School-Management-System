<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrollmentStatus;
use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\StudentApplication;
use App\Models\User;
use App\Notifications\StudentApplicationApproved;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentApprovalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $applications = StudentApplication::query()
            ->with('cohort')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest('created_at')
            ->paginate(20);

        return ApiResponse::success($applications);
    }

    public function approve(Request $request, StudentApplication $application): JsonResponse
    {
        if ($application->status !== 'PENDING_APPROVAL') {
            return ApiResponse::error('Only pending applications can be approved.', 422, 'APPLICATION_NOT_PENDING');
        }

        $status = $request->validate([
            'status' => ['sometimes', Rule::in([UserStatus::Active->value, UserStatus::InactivePaymentPending->value])],
        ])['status'] ?? UserStatus::InactivePaymentPending->value;

        $result = DB::transaction(function () use ($application, $request, $status): array {
            $studentNumber = $this->generateStudentNumber($application);

            $fullName = trim(implode(' ', array_filter([
                $application->first_name,
                $application->middle_name,
                $application->last_name,
            ])));

            $user = new User([
                'role_id' => AuthService::roleId(RoleSlug::Student),
                'cohort_id' => $application->cohort_id,
                'name' => $fullName,
                'email' => $application->student_email,
                'phone' => $application->student_phone,
                'student_number' => $studentNumber,
                'status' => $status,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ]);

            // 2. Bypass User model's 'hashed' cast to avoid double-hashing
            $user->getAttributes();
            $user->setRawAttributes(array_merge($user->getAttributes(), [
                'password' => $application->password,
            ]));
            $user->save();

            // 3. Provision enrollments for selected courses
            foreach ($application->selected_courses ?? [] as $courseId) {
                Enrollment::query()->firstOrCreate([
                    'student_id' => $user->id,
                    'course_id' => $courseId,
                ], [
                    'status' => EnrollmentStatus::Enrolled,
                ]);
            }

            // 4. Mark application approved
            $application->update([
                'status' => 'APPROVED',
                'approved_at' => now(),
                'approved_by' => $request->user()->id,
            ]);

            return [$user, $studentNumber];
        });

        [$user, $studentNumber] = $result;

        // Fire approval notification with student index number
        $user->notify(new StudentApplicationApproved($studentNumber));

        return ApiResponse::success([
            'application' => $application->fresh('cohort'),
            'student' => $user->load(['role', 'cohort']),
            'student_number' => $studentNumber,
        ], 'Student application approved.');
    }

    public function reject(Request $request, StudentApplication $application): JsonResponse
    {
        if ($application->status !== 'PENDING_APPROVAL') {
            return ApiResponse::error('Only pending applications can be rejected.', 422, 'APPLICATION_NOT_PENDING');
        }

        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:2000'],
        ]);

        $application->update([
            'status' => 'REJECTED',
            'rejection_reason' => $data['rejection_reason'],
        ]);

        return ApiResponse::success($application->fresh('cohort'), 'Student application rejected.');
    }

    private function generateStudentNumber(StudentApplication $application): string
    {
        $year = $application->created_at?->format('Y') ?? now()->format('Y');

        do {
            $number = 'STU-'.$year.'-'.Str::upper(Str::random(4));
        } while (User::query()->where('student_number', $number)->exists());

        return $number;
    }
}
