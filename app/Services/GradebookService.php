<?php

namespace App\Services;

use App\Enums\EnrollmentStatus;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Support\Collection;

class GradebookService
{
    public function courseSummary(Course $course): array
    {
        $assignments = $course->assignments()->orderBy('due_at')->get();
        $students = $course->enrollments()
            ->where('status', EnrollmentStatus::Enrolled)
            ->with('student')
            ->get()
            ->pluck('student');

        $submissions = Submission::query()
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $rows = $students->map(function (User $student) use ($assignments, $submissions) {
            $studentSubs = $submissions->get($student->id, collect());
            $cells = [];
            $earned = 0.0;
            $possible = 0.0;

            foreach ($assignments as $assignment) {
                $submission = $studentSubs->firstWhere('assignment_id', $assignment->id);
                $cells[] = [
                    'assignment_id' => $assignment->id,
                    'title' => $assignment->title,
                    'max_score' => (float) $assignment->max_score,
                    'score' => $submission?->score !== null ? (float) $submission->score : null,
                    'grades_published' => (bool) $submission?->grades_published,
                    'is_late' => (bool) $submission?->is_late,
                    'submitted_at' => $submission?->submitted_at,
                ];

                if ($submission?->score !== null) {
                    $earned += (float) $submission->score;
                    $possible += (float) $assignment->max_score;
                }
            }

            $percent = $possible > 0 ? round(($earned / $possible) * 100, 2) : null;

            return [
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'student_number' => $student->student_number,
                ],
                'assignments' => $cells,
                'earned' => $earned,
                'possible' => $possible,
                'percent' => $percent,
                'gpa_points' => $percent !== null
                    ? round(($percent / 100) * config('sms.gpa_scale'), 2)
                    : null,
            ];
        });

        $studentsPayload = $students->map(fn (User $student) => [
            'id' => $student->id,
            'name' => $student->name,
            'email' => $student->email,
            'student_number' => $student->student_number,
        ]);

        return [
            'course' => [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'credit_hours' => $course->credit_hours,
            ],
            'students' => $studentsPayload,
            'assignments' => $assignments->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'max_score' => (float) $a->max_score,
                'due_at' => $a->due_at,
            ]),
            'rows' => $rows,
        ];
    }

    public function studentTranscript(User $student): array
    {
        $enrollments = Enrollment::query()
            ->with(['course.assignments'])
            ->where('student_id', $student->id)
            ->where('status', '!=', EnrollmentStatus::Dropped)
            ->get();

        $published = Submission::query()
            ->where('student_id', $student->id)
            ->where('grades_published', true)
            ->whereNotNull('score')
            ->get()
            ->keyBy('assignment_id');

        $courses = [];
        $weighted = 0.0;
        $credits = 0;

        foreach ($enrollments as $enrollment) {
            $course = $enrollment->course;
            $earned = 0.0;
            $possible = 0.0;
            $items = [];

            foreach ($course->assignments as $assignment) {
                $submission = $published->get($assignment->id);
                if (! $submission) {
                    continue;
                }

                $earned += (float) $submission->score;
                $possible += (float) $assignment->max_score;
                $items[] = [
                    'assignment_id' => $assignment->id,
                    'title' => $assignment->title,
                    'score' => (float) $submission->score,
                    'max_score' => (float) $assignment->max_score,
                    'feedback' => $submission->feedback,
                    'graded_at' => $submission->graded_at,
                ];
            }

            $percent = $possible > 0 ? round(($earned / $possible) * 100, 2) : null;
            $gpa = $percent !== null ? round(($percent / 100) * config('sms.gpa_scale'), 2) : null;

            if ($gpa !== null) {
                $weighted += $gpa * $course->credit_hours;
                $credits += $course->credit_hours;
            }

            $courses[] = [
                'course_id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'credit_hours' => $course->credit_hours,
                'percent' => $percent,
                'gpa_points' => $gpa,
                'items' => $items,
            ];
        }

        return [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'student_number' => $student->student_number,
            ],
            'cumulative_gpa' => $credits > 0 ? round($weighted / $credits, 2) : null,
            'credit_hours' => $credits,
            'courses' => $courses,
        ];
    }
}
