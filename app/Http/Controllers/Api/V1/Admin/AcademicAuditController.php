<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Attendance;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class AcademicAuditController extends Controller
{
    public function attendance(): JsonResponse
    {
        $logs = Attendance::query()
            ->with(['student', 'marker', 'timetable.course'])
            ->latest('session_date')
            ->latest('id')
            ->limit(200)
            ->get()
            ->map(fn (Attendance $log) => [
                'id' => $log->id,
                'session_date' => $log->session_date?->toDateString(),
                'course_code' => $log->timetable?->course?->code,
                'student_name' => $log->student?->name,
                'student_number' => $log->student?->student_number,
                'status' => strtolower((string) $log->status?->value),
                'marked_by' => $log->marker?->name,
                'notes' => $log->notes ?? '',
            ]);

        return ApiResponse::success($logs);
    }

    public function assignments(): JsonResponse
    {
        $assignments = Assignment::query()
            ->with(['course', 'teacher', 'submissions'])
            ->latest('due_at')
            ->limit(200)
            ->get()
            ->map(function (Assignment $assignment) {
                $submissions = $assignment->submissions;
                $graded = $submissions->whereNotNull('score');
                $maxScore = max((float) $assignment->max_score, 1);

                return [
                    'id' => $assignment->id,
                    'course_code' => $assignment->course?->code,
                    'title' => $assignment->title,
                    'teacher_name' => $assignment->teacher?->name,
                    'due_date' => $assignment->due_at?->toDateString(),
                    'total_submissions' => $submissions->whereNotNull('submitted_at')->count(),
                    'graded_count' => $graded->count(),
                    'average_score' => $graded->count() > 0
                        ? round(((float) $graded->avg('score') / $maxScore) * 100, 1)
                        : 0,
                ];
            });

        return ApiResponse::success($assignments);
    }
}
