<?php

namespace App\Models;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'role_id',
    'name',
    'email',
    'phone',
    'employee_id',
    'student_number',
    'password',
    'google_id',
    'status',
    'must_change_password',
    'email_verified_at',
    'cohort_id',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'status' => UserStatus::class,
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function taughtTimetables(): HasMany
    {
        return $this->hasMany(Timetable::class, 'teacher_id');
    }

    public function cohort(): BelongsTo
    {
        return $this->belongsTo(Cohort::class);
    }

    public function enrolledCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'enrollments', 'student_id', 'course_id')
            ->withPivot('status')
            ->withTimestamps();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'student_id');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class, 'student_id');
    }

    public function assignmentsCreated(): HasMany
    {
        return $this->hasMany(Assignment::class, 'teacher_id');
    }

    public function isAdmin(): bool
    {
        return $this->role?->slug === RoleSlug::Admin->value;
    }

    public function isTeacher(): bool
    {
        return $this->role?->slug === RoleSlug::Teacher->value;
    }

    public function isStudent(): bool
    {
        return $this->role?->slug === RoleSlug::Student->value;
    }

    public function hasRole(string ...$slugs): bool
    {
        return in_array($this->role?->slug, $slugs, true);
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    public function dashboardPath(): string
    {
        return match ($this->role?->slug) {
            RoleSlug::Admin->value => '/admin-portal',
            RoleSlug::Teacher->value => '/teacher-portal',
            default => '/student-portal',
        };
    }
}
