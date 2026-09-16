<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cohort;
use App\Models\Course;
use App\Models\Timetable;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CohortController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cohorts = Cohort::query()
            ->withCount('courses')
            ->when($request->has('active'), fn ($query) => $query->where('is_active', $request->boolean('active')))
            ->orderBy('starts_on', 'desc')
            ->get()
            ->map(function ($cohort) {
                // Resolve total distinct students enrolled across all courses in this cohort
                $cohort->students_count = User::query()
                    ->whereHas('enrollments.course', fn ($c) => $c->where('cohort_id', $cohort->id))
                    ->count();

                return $cohort;
            });

        return ApiResponse::success($cohorts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:32', 'unique:cohorts,code'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $cohort = DB::transaction(function () use ($data) {
            $cohort = Cohort::query()->create($data);

            if (! empty($data['is_active'])) {
                Cohort::query()->whereKeyNot($cohort->id)->update(['is_active' => false]);
            }

            return $cohort;
        });

        return ApiResponse::success($cohort->loadCount('courses'), 'Cohort created.', 201);
    }

    public function show(Cohort $cohort): JsonResponse
    {
        // Eager load courses, their schedule slots, and distinct registered students
        $courses = $cohort->courses()->with(['timetables.teacher'])->get();

        $students = User::query()
            ->whereHas('enrollments.course', fn ($c) => $c->where('cohort_id', $cohort->id))
            ->with(['role'])
            ->select('id', 'name', 'email', 'phone', 'student_number', 'status')
            ->get();

        $cohortData = $cohort->toArray();
        $cohortData['courses_count'] = $courses->count();
        $cohortData['students_count'] = $students->count();
        $cohortData['courses'] = $courses;
        $cohortData['students'] = $students;

        return ApiResponse::success($cohortData);
    }

    public function update(Request $request, Cohort $cohort): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'code' => ['sometimes', 'string', 'max:32', Rule::unique('cohorts', 'code')->ignore($cohort->id)],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date', 'after_or_equal:starts_on'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($cohort, $data) {
            $cohort->update($data);

            if (! empty($data['is_active'])) {
                Cohort::query()->whereKeyNot($cohort->id)->update(['is_active' => false]);
            }
        });

        return ApiResponse::success($cohort->fresh()->loadCount('courses'), 'Cohort updated.');
    }

    public function destroy(Cohort $cohort): JsonResponse
    {
        DB::transaction(function () use ($cohort) {
            // Cascade cleanup of courses and timetable sessions under this cohort
            $courseIds = $cohort->courses()->pluck('id');
            Timetable::query()->whereIn('course_id', $courseIds)->delete();
            $cohort->courses()->delete();
            $cohort->delete();
        });

        return ApiResponse::success(null, 'Cohort deleted.');
    }

    /**
     * Duplicates courses and timetable schedules from a past cohort into the current one.
     */
    public function copyFromPrevious(Request $request, Cohort $cohort): JsonResponse
    {
        $data = $request->validate([
            'source_cohort_id' => ['required', 'exists:cohorts,id', 'different:'.$cohort->id],
        ]);

        $sourceCohort = Cohort::query()->with('courses.timetables')->findOrFail($data['source_cohort_id']);

        DB::transaction(function () use ($sourceCohort, $cohort) {
            foreach ($sourceCohort->courses as $oldCourse) {
                // Duplicate course linked to the new cohort
                $newCourseCode = $oldCourse->code.'-'.$cohort->code;

                // Avoid collision if course code already exists
                $courseCode = Course::query()->where('code', $oldCourse->code)->exists()
                    ? $newCourseCode
                    : $oldCourse->code;

                $newCourse = Course::query()->create([
                    'cohort_id' => $cohort->id,
                    'code' => $courseCode,
                    'title' => $oldCourse->title,
                    'credit_hours' => $oldCourse->credit_hours,
                    'description' => $oldCourse->description,
                ]);

                // Duplicate timetable slots and virtual links
                foreach ($oldCourse->timetables as $slot) {
                    Timetable::query()->create([
                        'course_id' => $newCourse->id,
                        'teacher_id' => $slot->teacher_id,
                        'day_of_week' => $slot->day_of_week,
                        'start_time' => $slot->start_time,
                        'end_time' => $slot->end_time,
                        'classroom' => $slot->classroom,
                        'delivery_mode' => $slot->delivery_mode,
                        'virtual_platform' => $slot->virtual_platform,
                        'meeting_link' => $slot->meeting_link,
                        'meeting_opens_minutes_before' => $slot->meeting_opens_minutes_before,
                    ]);
                }
            }
        });

        return ApiResponse::success(
            $cohort->loadCount('courses'),
            "Courses and timetable duplicated from {$sourceCohort->name} successfully."
        );
    }
}
