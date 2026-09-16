<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Timetable;
use App\Models\User;
use App\Notifications\AccountCreatedNotification;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TeacherController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->with('role')
            ->whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Teacher->value))
            ->when($request->string('search')->toString(), function ($q, $search) {
                $q->where(fn ($inner) => $inner
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%"));
            })
            ->latest();

        $teachers = $request->boolean('all') ? $query->get() : $query->paginate(20);

        return ApiResponse::success(
            $teachers instanceof AbstractPaginator
                ? UserResource::collection($teachers)->response()->getData(true)
                : UserResource::collection($teachers)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:32'],
            'employee_id' => ['required', 'string', 'max:64', 'unique:users,employee_id'],
        ]);

        $passwordLength = (int) (config('sms.temp_password_length') ?: 10);
        $temporaryPassword = Str::password($passwordLength);

        $teacher = User::query()->create([
            ...$data,
            'role_id' => AuthService::roleId(RoleSlug::Teacher),
            'password' => $temporaryPassword,
            'must_change_password' => true,
            'status' => UserStatus::Active,
        ]);

        $teacher->notify(new AccountCreatedNotification($temporaryPassword));

        return ApiResponse::success([
            'teacher' => new UserResource($teacher->load('role')),
            'temporary_password' => $temporaryPassword,
        ], 'Lecturer account provisioned.', 201);
    }

    public function show(User $teacher): JsonResponse
    {
        abort_unless($teacher->isTeacher(), 404);

        return ApiResponse::success(new UserResource($teacher->load('role')));
    }

    public function update(Request $request, User $teacher): JsonResponse
    {
        abort_unless($teacher->isTeacher(), 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($teacher->id)],
            'phone' => ['sometimes', 'string', 'max:32'],
            'employee_id' => ['sometimes', 'string', 'max:64', Rule::unique('users', 'employee_id')->ignore($teacher->id)],
            'status' => ['sometimes', Rule::enum(UserStatus::class)],
        ]);

        $teacher->update($data);

        return ApiResponse::success(new UserResource($teacher->fresh('role')), 'Lecturer updated.');
    }

    public function destroy(User $teacher): JsonResponse
    {
        abort_unless($teacher->isTeacher(), 404);

        DB::transaction(function () use ($teacher) {
            // Unassign or delete lecture schedules tied to this teacher
            Timetable::query()->where('teacher_id', $teacher->id)->delete();
            $teacher->tokens()->delete();
            $teacher->delete();
        });

        return ApiResponse::success(null, 'Lecturer deleted.');
    }
}
