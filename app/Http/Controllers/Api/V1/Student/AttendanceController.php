<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cohortId = $request->integer('cohort_id') ?: $user->cohort_id;

        $query = Attendance::query()
            ->with(['timetable.course', 'timetable.teacher'])
            ->where('student_id', $user->id)
            ->latest('session_date');

        if ($cohortId) {
            $query->where(function ($q) use ($cohortId) {
                $q->whereHas('timetable.course', fn ($c) => $c->where('cohort_id', $cohortId))
                    ->orWhereHas('student', fn ($s) => $s->where('cohort_id', $cohortId));
            });
        }

        $attendances = $query->limit(100)->get();

        // Batch-load loose course or marker records without N+1 queries or nested relationship crashes
        $looseCourseIds = $attendances->whereNull('timetable')->pluck('course_id')->filter()->unique();
        $looseCourses = $looseCourseIds->isNotEmpty()
            ? Course::whereIn('id', $looseCourseIds)->get()->keyBy('id')
            : collect();

        $markedByIds = $attendances->pluck('marked_by')->filter()->unique();
        $markers = $markedByIds->isNotEmpty()
            ? User::whereIn('id', $markedByIds)->pluck('name', 'id')
            : collect();

        $records = $attendances->map(function ($record) use ($looseCourses, $markers) {
            $timetable = $record->timetable;
            $course = $timetable?->course ?? ($record->course_id ? $looseCourses->get($record->course_id) : null);

            $teacherName = null;
            if ($record->marked_by && isset($markers[$record->marked_by])) {
                $teacherName = $markers[$record->marked_by];
            }

            if (! $teacherName) {
                $teacherName = $timetable?->teacher?->name ?? 'Assigned Tutor';
            }

            $rawStatus = is_object($record->status) && isset($record->status->value)
                ? $record->status->value
                : (string) ($record->status ?? 'PRESENT');

            return [
                'id' => $record->id,
                'session_date' => $record->session_date ? Carbon::parse($record->session_date)->toDateString() : null,
                'course_code' => $course?->code ?? 'SUB-GEN',
                'course_title' => $course?->title ?? 'General Subject',
                'teacher_name' => $teacherName,
                'status' => strtoupper($rawStatus),
                'notes' => $record->notes ?: 'Marked by instructor',
            ];
        });

        return ApiResponse::success($records);
    }
}
