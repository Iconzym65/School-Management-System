<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {

        $primaryCohort = null;

        if ($this->relationLoaded('cohort') && $this->cohort) {
            $primaryCohort = $this->cohort;
        } elseif ($this->relationLoaded('enrollments')) {
            $primaryCohort = $this->enrollments
                ->first(fn ($enrollment) => $enrollment->relationLoaded('course') && $enrollment->course?->relationLoaded('cohort'))
                ?->course
                ?->cohort
                ?? $this->enrollments->first()?->course?->cohort;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'employee_id' => $this->employee_id,
            'student_number' => $this->student_number,
            'status' => $this->status?->value ?? $this->status,
            'must_change_password' => (bool) $this->must_change_password,
            'has_google' => (bool) $this->google_id,
            'role' => [
                'id' => $this->role?->id,
                'name' => $this->role?->name,
                'slug' => $this->role?->slug,
            ],
            'cohort' => $primaryCohort ? [
                'id' => $primaryCohort->id,
                'name' => $primaryCohort->name,
                'code' => $primaryCohort->code,
            ] : null,
            'cohort_id' => $primaryCohort?->id,
            'enrollments' => $this->whenLoaded('enrollments', function () {
                return $this->enrollments->map(fn ($enrollment) => [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status?->value ?? $enrollment->status,
                    'course_id' => $enrollment->course_id,
                    'course' => $enrollment->relationLoaded('course') ? [
                        'id' => $enrollment->course?->id,
                        'code' => $enrollment->course?->code,
                        'title' => $enrollment->course?->title,
                        'cohort_id' => $enrollment->course?->cohort_id,
                        'cohort' => $enrollment->course?->relationLoaded('cohort')
                            ? [
                                'id' => $enrollment->course->cohort?->id,
                                'name' => $enrollment->course->cohort?->name,
                                'code' => $enrollment->course->cohort?->code,
                            ]
                            : null,
                    ] : null,
                ]);
            }),
            'created_at' => $this->created_at?->toIso8601String() ?? $this->created_at,
        ];
    }
}
