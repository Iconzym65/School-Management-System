<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrollmentStatus;
use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Enrollment;
use App\Models\User;
use App\Notifications\AccountCreatedNotification;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $students = User::query()
            ->with(['role', 'cohort', 'enrollments.course.cohort'])
            ->whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Student->value))
            ->when($request->integer('cohort_id'), function ($q, $cohortId) {
                $q->where(function ($sub) use ($cohortId) {
                    $sub->where('cohort_id', $cohortId)
                        ->orWhereHas('enrollments.course', fn ($c) => $c->where('cohort_id', $cohortId));
                });
            })
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->string('search')->toString(), function ($q, $search) {
                $q->where(fn ($inner) => $inner
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(50);

        return ApiResponse::success(UserResource::collection($students)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'student_number' => ['nullable', 'string', 'max:64', 'unique:users,student_number'],
            'status' => ['nullable', Rule::enum(UserStatus::class)],
            'cohort_id' => ['nullable', 'exists:cohorts,id'],
            'course_ids' => ['nullable', 'array'],
            'course_ids.*' => ['exists:courses,id'],
        ]);

        $studentNumber = $data['student_number'] ?? null;
        if (empty($studentNumber)) {
            do {
                $studentNumber = 'STU-'.date('Y').'-'.strtoupper(Str::random(5));
            } while (User::query()->where('student_number', $studentNumber)->exists());
        }

        $passwordLength = (int) (config('sms.temp_password_length') ?: 10);
        $temporaryPassword = Str::password($passwordLength);

        $student = DB::transaction(function () use ($data, $studentNumber, $temporaryPassword) {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'student_number' => $studentNumber,
                'status' => $data['status'] ?? UserStatus::InactivePaymentPending,
                'cohort_id' => $data['cohort_id'] ?? null,
                'role_id' => AuthService::roleId(RoleSlug::Student),
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ]);

            if (! empty($data['course_ids'])) {
                foreach ($data['course_ids'] as $courseId) {
                    Enrollment::query()->firstOrCreate(
                        ['student_id' => $user->id, 'course_id' => (int) $courseId],
                        ['status' => EnrollmentStatus::Enrolled]
                    );
                }
            }

            return $user;
        });

        $student->notify(new AccountCreatedNotification($temporaryPassword));

        return ApiResponse::success([
            'student' => new UserResource($student->load(['role', 'cohort', 'enrollments.course.cohort'])),
            'temporary_password' => $temporaryPassword,
        ], 'Student enrolled successfully.', 201);
    }

    public function show(User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        $student->load(['role', 'cohort', 'enrollments.course.cohort']);

        $application = DB::table('student_applications')
            ->where('student_email', $student->email)
            ->first();

        $resource = (new UserResource($student))->resolve();

        return ApiResponse::success(array_merge($resource, [
            'student' => $resource,
            'application' => [
                'first_name' => $application->first_name ?? null,
                'middle_name' => $application->middle_name ?? null,
                'last_name' => $application->last_name ?? null,
                'gender' => $application->gender ?? null,
                'dob' => $application->dob ?? null,
                'student_phone' => $application->student_phone ?? $student->phone ?? null,
                'student_email' => $application->student_email ?? $student->email,
                'residential_address' => $application->residential_address ?? null,
                'city' => $application->city ?? null,
                'previous_institution' => $application->previous_institution ?? null,
                'current_level' => $application->current_level ?? null,
                'stream_track' => $application->stream_track ?? null,
                'student_id_reference' => $application->student_id_reference ?? null,
                'selected_courses' => isset($application->selected_courses) ? json_decode($application->selected_courses, true) : [],
                'guardian_name' => $application->guardian_name ?? null,
                'guardian_relationship' => $application->guardian_relationship ?? null,
                'guardian_email' => $application->guardian_email ?? null,
                'guardian_phone' => $application->guardian_phone ?? null,
                'guardian_whatsapp' => $application->guardian_whatsapp ?? null,
                'application_status' => $application->status ?? null,
                'approved_at' => $application->approved_at ?? null,
            ],
            'enrolled_course_ids' => $student->enrollments->pluck('course_id')->values()->all(),
        ]));
    }

    public function update(Request $request, User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        $data = $request->validate([
            // User Table Attributes
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($student->id)],
            'phone' => ['nullable', 'string', 'max:32'],
            'student_number' => ['sometimes', 'string', 'max:64', Rule::unique('users', 'student_number')->ignore($student->id)],
            'status' => ['sometimes', Rule::enum(UserStatus::class), 'string'],
            'cohort_id' => ['sometimes', 'nullable', 'exists:cohorts,id'],
            'course_ids' => ['nullable', 'array'],
            'course_ids.*' => ['exists:courses,id'],

            // Student Application Attributes
            'first_name' => ['nullable', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'string', 'max:32'],
            'dob' => ['nullable', 'date'],
            'residential_address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'previous_institution' => ['nullable', 'string', 'max:255'],
            'current_level' => ['nullable', 'string', 'max:100'],
            'stream_track' => ['nullable', 'string', 'max:100'],
            'student_id_reference' => ['nullable', 'string', 'max:100'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_relationship' => ['nullable', 'string', 'max:100'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:32'],
            'guardian_whatsapp' => ['nullable', 'string', 'max:32'],
        ]);

        DB::transaction(function () use ($request, $student, $data) {
            // 1. Update Core User Model
            $student->name = $data['name'] ?? $student->name;
            $student->email = $data['email'] ?? $student->email;
            $student->phone = array_key_exists('phone', $data) ? $data['phone'] : $student->phone;
            $student->student_number = $data['student_number'] ?? $student->student_number;
            $student->status = $data['status'] ?? $student->status;

            if ($request->has('cohort_id')) {
                $student->cohort_id = $data['cohort_id'] ? (int) $data['cohort_id'] : null;
            }

            $student->save();

            // 2. Update Student Application Bio-Data
            $appFields = [
                'first_name', 'middle_name', 'last_name', 'gender', 'dob',
                'residential_address', 'city', 'previous_institution',
                'current_level', 'stream_track', 'student_id_reference',
                'guardian_name', 'guardian_relationship', 'guardian_email',
                'guardian_phone', 'guardian_whatsapp',
            ];

            $appUpdate = [];
            foreach ($appFields as $field) {
                if (array_key_exists($field, $data)) {
                    $appUpdate[$field] = $data[$field];
                }
            }

            if ($request->has('cohort_id') && $student->cohort_id) {
                $appUpdate['cohort_id'] = $student->cohort_id;
            }
            if ($request->has('phone')) {
                $appUpdate['student_phone'] = $data['phone'];
            }
            if ($request->has('email')) {
                $appUpdate['student_email'] = $data['email'];
            }

            if (! empty($appUpdate)) {
                DB::table('student_applications')
                    ->where('student_email', $student->getOriginal('email'))
                    ->update($appUpdate);
            }

            // 3. Synchronize Selected Courses
            if ($request->has('course_ids')) {
                $selectedIds = collect($data['course_ids'] ?? [])->map(fn ($id) => (int) $id)->all();

                Enrollment::query()
                    ->where('student_id', $student->id)
                    ->whereNotIn('course_id', $selectedIds)
                    ->delete();

                foreach ($selectedIds as $courseId) {
                    Enrollment::query()->firstOrCreate(
                        ['student_id' => $student->id, 'course_id' => $courseId],
                        ['status' => EnrollmentStatus::Enrolled]
                    );
                }
            }
        });

        return ApiResponse::success(
            new UserResource($student->fresh(['role', 'cohort', 'enrollments.course.cohort'])),
            'Student profile, registration record, and course assignments updated.'
        );
    }

    public function updateStatus(Request $request, User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        $data = $request->validate([
            'status' => ['required', Rule::enum(UserStatus::class)],
        ]);

        $student->update(['status' => $data['status']]);

        return ApiResponse::success(new UserResource($student->fresh(['role', 'cohort', 'enrollments.course.cohort'])), 'Student status updated.');
    }

    public function destroy(User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        DB::transaction(function () use ($student) {
            $student->enrollments()->delete();
            $student->submissions()->delete();
            $student->tokens()->delete();
            $student->delete();
        });

        return ApiResponse::success(null, 'Student account deleted successfully.');
    }
}
