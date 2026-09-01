<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $students = User::query()
            ->with(['role', 'enrollments.course.cohort'])
            ->whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Student->value))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->string('search')->toString(), function ($q, $search) {
                $q->where(fn ($inner) => $inner
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(20);

        return ApiResponse::success(UserResource::collection($students)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'student_number' => ['required', 'string', 'max:64', 'unique:users,student_number'],
            'status' => ['nullable', Rule::enum(UserStatus::class)],
        ]);

        $temporaryPassword = Str::password((int) config('sms.temp_password_length'));

        $student = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'student_number' => $data['student_number'],
            'status' => $data['status'] ?? UserStatus::InactivePaymentPending,
            'role_id' => AuthService::roleId(RoleSlug::Student),
            'password' => $temporaryPassword,
            'must_change_password' => true,
        ]);

        return ApiResponse::success([
            'student' => new UserResource($student->load('role')),
            'temporary_password' => $temporaryPassword,
        ], 'Student account created.', 201);
    }

    public function show(User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        return ApiResponse::success(new UserResource($student->load('role')));
    }

    public function updateStatus(Request $request, User $student): JsonResponse
    {
        abort_unless($student->isStudent(), 404);

        $data = $request->validate([
            'status' => ['required', Rule::enum(UserStatus::class)],
        ]);

        $student->update(['status' => $data['status']]);

        return ApiResponse::success(new UserResource($student->fresh('role')), 'Student status updated.');
    }
}
