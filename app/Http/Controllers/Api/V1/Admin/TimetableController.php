<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DayOfWeek;
use App\Enums\DeliveryMode;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\Timetable;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TimetableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $slots = Timetable::query()
            ->with(['course', 'teacher'])
            ->when($request->integer('course_id'), fn ($q, $id) => $q->where('course_id', $id))
            ->when($request->integer('teacher_id'), fn ($q, $id) => $q->where('teacher_id', $id))
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success($slots);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $this->assertTeacher($data['teacher_id']);

        $slot = Timetable::query()->create($data);

        return ApiResponse::success($slot->load(['course', 'teacher']), 'Timetable slot created.', 201);
    }

    public function update(Request $request, Timetable $timetable): JsonResponse
    {
        $data = $this->validated($request, true);

        if (isset($data['teacher_id'])) {
            $this->assertTeacher($data['teacher_id']);
        }

        $timetable->update($data);

        return ApiResponse::success($timetable->fresh(['course', 'teacher']), 'Timetable slot updated.');
    }

    public function updateMeetingLink(Request $request, Timetable $timetable): JsonResponse
    {
        $data = $request->validate([
            'meeting_link' => ['nullable', 'url', 'max:2048'],
        ]);

        $timetable->update($data);

        return ApiResponse::success($timetable->fresh(), 'Meeting link updated.');
    }

    public function destroy(Timetable $timetable): JsonResponse
    {
        $timetable->delete();

        return ApiResponse::success(null, 'Timetable slot deleted.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'course_id' => [$required, 'exists:courses,id'],
            'teacher_id' => [$required, 'exists:users,id'],
            'day_of_week' => [$required, Rule::enum(DayOfWeek::class)],
            'start_time' => [$required, 'date_format:H:i'],
            'end_time' => [$required, 'date_format:H:i', 'after:start_time'],
            'classroom' => ['nullable', 'string', 'max:128'],
            'delivery_mode' => ['sometimes', Rule::enum(DeliveryMode::class)],
            'meeting_link' => ['nullable', 'url', 'max:2048'],
            'meeting_opens_minutes_before' => ['sometimes', 'integer', 'min:0', 'max:120'],
        ]);
    }

    private function assertTeacher(int $teacherId): void
    {
        $teacher = User::query()->with('role')->findOrFail($teacherId);
        abort_unless($teacher->hasRole(RoleSlug::Teacher->value), 422, 'Assigned user must be a lecturer.');
    }
}
