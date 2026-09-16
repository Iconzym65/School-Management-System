<?php

namespace Tests\Feature;

use App\Enums\AttendanceStatus;
use App\Enums\DayOfWeek;
use App\Enums\DeliveryMode;
use App\Enums\EnrollmentStatus;
use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Models\Assignment;
use App\Models\Attendance;
use App\Models\Cohort;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Role;
use App\Models\Submission;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAcademicAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_401_when_no_token_is_provided(): void
    {
        $this->getJson('/api/v1/admin/attendance-logs')->assertUnauthorized();
        $this->getJson('/api/v1/admin/assignment-audits')->assertUnauthorized();
    }

    public function test_forbids_teachers_from_admin_audit_endpoints(): void
    {
        $teacherRole = Role::firstOrCreate(['slug' => RoleSlug::Teacher->value], ['name' => 'Teacher']);
        $teacher = User::factory()->create([
            'role_id' => $teacherRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);

        Sanctum::actingAs($teacher);

        $this->getJson('/api/v1/admin/attendance-logs')->assertForbidden();
        $this->getJson('/api/v1/admin/assignment-audits')->assertForbidden();
    }

    public function test_admin_receives_attendance_and_assignment_audit_rows(): void
    {
        $adminRole = Role::firstOrCreate(['slug' => RoleSlug::Admin->value], ['name' => 'Administrator']);
        $teacherRole = Role::firstOrCreate(['slug' => RoleSlug::Teacher->value], ['name' => 'Teacher']);
        $studentRole = Role::firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);

        $admin = User::factory()->create([
            'role_id' => $adminRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);
        $teacher = User::factory()->create([
            'role_id' => $teacherRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);
        $student = User::factory()->create([
            'role_id' => $studentRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
            'student_number' => 'STU-2026-0881',
        ]);

        $cohort = Cohort::query()->create([
            'name' => 'Vacation Batch A',
            'code' => 'VAC-2026-A',
            'starts_on' => '2026-06-01',
            'ends_on' => '2026-08-31',
            'is_active' => true,
        ]);

        $course = Course::query()->create([
            'cohort_id' => $cohort->id,
            'code' => 'CS101',
            'title' => 'Data Structures',
            'credit_hours' => 3,
        ]);

        Enrollment::query()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'status' => EnrollmentStatus::Enrolled,
        ]);

        $timetable = Timetable::query()->create([
            'course_id' => $course->id,
            'teacher_id' => $teacher->id,
            'day_of_week' => DayOfWeek::Monday,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'delivery_mode' => DeliveryMode::Virtual,
            'meeting_link' => 'https://zoom.us/j/1234567890',
        ]);

        Attendance::query()->create([
            'timetable_id' => $timetable->id,
            'student_id' => $student->id,
            'session_date' => '2026-08-25',
            'status' => AttendanceStatus::Present,
            'marked_by' => $teacher->id,
            'marked_at' => now(),
            'notes' => 'On time.',
        ]);

        $assignment = Assignment::query()->create([
            'teacher_id' => $teacher->id,
            'course_id' => $course->id,
            'title' => 'Lab 1',
            'max_score' => 100,
            'due_at' => now()->addDay(),
            'is_published' => true,
        ]);

        Submission::query()->create([
            'student_id' => $student->id,
            'assignment_id' => $assignment->id,
            'submitted_at' => now(),
            'score' => 88,
            'grades_published' => true,
        ]);

        Sanctum::actingAs($admin);

        $attendance = $this->getJson('/api/v1/admin/attendance-logs');
        $attendance->assertOk();
        $attendance->assertJsonPath('data.0.course_code', 'CS101');
        $attendance->assertJsonPath('data.0.student_number', 'STU-2026-0881');
        $attendance->assertJsonPath('data.0.status', 'present');

        $assignments = $this->getJson('/api/v1/admin/assignment-audits');
        $assignments->assertOk();
        $assignments->assertJsonPath('data.0.title', 'Lab 1');
        $assignments->assertJsonPath('data.0.total_submissions', 1);
        $assignments->assertJsonPath('data.0.graded_count', 1);
        $assignments->assertJsonPath('data.0.average_score', 88);
    }

    public function test_admin_portal_view_renders(): void
    {
        $adminRole = Role::firstOrCreate(['slug' => RoleSlug::Admin->value], ['name' => 'Admin']);
        $admin = User::factory()->create([
            'role_id' => $adminRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);

        $this->actingAs($admin);

        $this->get('/admin-portal')
            ->assertOk()
            ->assertSee('admin-portal-root', false);
    }
}
