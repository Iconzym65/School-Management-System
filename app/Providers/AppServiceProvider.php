<?php

namespace App\Providers;

use App\Models\Assignment;
use App\Models\Attendance;
use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\Timetable;
use App\Policies\AssignmentPolicy;
use App\Policies\AttendancePolicy;
use App\Policies\CohortPolicy;
use App\Policies\CoursePolicy;
use App\Policies\EnrollmentPolicy;
use App\Policies\SubmissionPolicy;
use App\Policies\TimetablePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Assignment::class, AssignmentPolicy::class);
        Gate::policy(Attendance::class, AttendancePolicy::class);
        Gate::policy(Cohort::class, CohortPolicy::class);
        Gate::policy(Course::class, CoursePolicy::class);
        Gate::policy(Enrollment::class, EnrollmentPolicy::class);
        Gate::policy(Submission::class, SubmissionPolicy::class);
        Gate::policy(Timetable::class, TimetablePolicy::class);
    }
}
