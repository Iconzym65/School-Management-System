<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\Timetable;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceService
{
    public function editWindowHours(): int
    {
        return (int) Setting::getValue(
            'attendance_edit_window_hours',
            config('sms.attendance_edit_window_hours')
        );
    }

    public function markForSession(
        Timetable $timetable,
        CarbonInterface $sessionDate,
        User $actor,
        array $records,
        bool $overrideWindow = false,
    ): void {
        $sessionDateString = $sessionDate->toDateString();
        $sessionEnd = $timetable->sessionEndOnDate($sessionDateString);

        if (! $overrideWindow && $sessionDate->toDateString() === now()->toDateString() && now()->lt($sessionEnd)) {
            throw ValidationException::withMessages([
                'session_date' => ['Attendance can be recorded after the scheduled class window ends.'],
            ]);
        }

        if (! $overrideWindow && $this->isOutsideEditWindow($sessionEnd)) {
            throw ValidationException::withMessages([
                'session_date' => ['The attendance edit window has closed.'],
            ]);
        }

        $enrolledIds = $timetable->course->enrollments()
            ->where('status', EnrollmentStatus::Enrolled)
            ->pluck('student_id')
            ->all();

        DB::transaction(function () use ($records, $enrolledIds, $timetable, $sessionDateString, $actor) {
            foreach ($records as $record) {
                $studentId = (int) $record['student_id'];

                if (! in_array($studentId, $enrolledIds, true)) {
                    abort(422, "Student {$studentId} is not enrolled in this course.");
                }

                Attendance::query()->updateOrCreate(
                    [
                        'timetable_id' => $timetable->id,
                        'student_id' => $studentId,
                        'session_date' => $sessionDateString,
                    ],
                    [
                        'status' => AttendanceStatus::from($record['status']),
                        'notes' => $record['notes'] ?? null,
                        'marked_by' => $actor->id,
                        'marked_at' => now(),
                    ],
                );
            }
        });
    }

    public function isOutsideEditWindow(CarbonInterface $sessionEnd): bool
    {
        return now()->gt(Carbon::parse($sessionEnd)->addHours($this->editWindowHours()));
    }
}
