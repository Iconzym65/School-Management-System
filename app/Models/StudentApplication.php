<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentApplication extends Model
{
    protected $fillable = [
        'cohort_id',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'dob',
        'student_phone',
        'student_email',
        'residential_address',
        'city',
        'previous_institution',
        'current_level',
        'stream_track',
        'student_id_reference',
        'selected_courses',
        'guardian_name',
        'guardian_relationship',
        'guardian_email',
        'guardian_phone',
        'guardian_whatsapp',
        'password',
        'status',
        'rejection_reason',
        'approved_at',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'selected_courses' => 'array',
            'dob' => 'date',
            'approved_at' => 'datetime',
        ];
    }

    public function cohort(): BelongsTo
    {
        return $this->belongsTo(Cohort::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
