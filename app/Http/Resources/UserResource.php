<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'employee_id' => $this->employee_id,
            'student_number' => $this->student_number,
            'status' => $this->status?->value,
            'must_change_password' => (bool) $this->must_change_password,
            'has_google' => (bool) $this->google_id,
            'role' => [
                'id' => $this->role?->id,
                'name' => $this->role?->name,
                'slug' => $this->role?->slug,
            ],
            'enrollments' => $this->whenLoaded('enrollments', function () {
                return $this->enrollments->map(fn ($enrollment) => [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status?->value,
                    'course_id' => $enrollment->course_id,
                    'course' => $enrollment->relationLoaded('course') ? [
                        'id' => $enrollment->course?->id,
                        'code' => $enrollment->course?->code,
                        'title' => $enrollment->course?->title,
                        'cohort_id' => $enrollment->course?->cohort_id,
                        'cohort' => $enrollment->course?->relationLoaded('cohort')
                            ? $enrollment->course?->cohort
                            : null,
                    ] : null,
                ]);
            }),
            'created_at' => $this->created_at,
        ];
    }
}
