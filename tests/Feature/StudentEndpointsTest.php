<?php

namespace Tests\Feature;

use App\Enums\DayOfWeek;
use App\Enums\DeliveryMode;
use App\Enums\EnrollmentStatus;
use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Models\AcademicYear;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Role;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected Role $studentRole;
    protected Role $teacherRole;
    protected User $activeStudent;
    protected User $teacher;
    protected Course $course;
    protected Timetable $timetable;

    protected function setUp(): void
    {
        parent::setUp();

        $this->studentRole = Role::firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);
        $this->teacherRole = Role::firstOrCreate(['slug' => RoleSlug::Teacher->value], ['name' => 'Teacher']);

        $this->activeStudent = User::factory()->create([
            'role_id' => $this->studentRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);

        $this->teacher = User::factory()->create([
            'role_id' => $this->teacherRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);

        $dept = Department::create(['code' => 'CS', 'name' => 'Computer Science']);
        $year = AcademicYear::create([
            'name' => '2026/2027',
            'starts_on' => '2026-09-01',
            'ends_on' => '2027-06-30',
            'is_current' => true,
        ]);
        $semester = Semester::create([
            'academic_year_id' => $year->id,
            'name' => 'First Semester',
            'starts_on' => '2026-09-01',
            'ends_on' => '2027-01-31',
            'is_current' => true,
        ]);

        $this->course = Course::create([
            'department_id' => $dept->id,
            'academic_year_id' => $year->id,
            'semester_id' => $semester->id,
            'code' => 'CS101',
            'title' => 'Intro to Programming',
            'credit_hours' => 3,
        ]);

        Enrollment::create([
            'student_id' => $this->activeStudent->id,
            'course_id' => $this->course->id,
            'status' => EnrollmentStatus::Enrolled,
        ]);

        $this->timetable = Timetable::create([
            'course_id' => $this->course->id,
            'teacher_id' => $this->teacher->id,
            'day_of_week' => DayOfWeek::Monday,
            'start_time' => '10:00',
            'end_time' => '11:30',
            'meeting_link' => 'https://zoom.us/j/1234567890',
            'delivery_mode' => DeliveryMode::Virtual,
            'meeting_opens_minutes_before' => 10,
        ]);
    }

    public function test_inactive_student_is_blocked_by_payment_firewall(): void
    {
        $unpaidStudent = User::factory()->create([
            'role_id' => $this->studentRole->id,
            'status' => UserStatus::InactivePaymentPending,
            'must_change_password' => false,
        ]);

        Sanctum::actingAs($unpaidStudent);

        $response = $this->getJson('/api/v1/student/dashboard');

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'code' => 'STUDENT_INACTIVE',
        ]);
    }

    public function test_active_student_can_view_dashboard_and_enrolled_courses(): void
    {
        Sanctum::actingAs($this->activeStudent);

        $response = $this->getJson('/api/v1/student/dashboard');

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data' => [
                'courses',
                'today_schedule',
                'upcoming_deadlines',
            ],
        ]);
    }

    public function test_active_student_can_view_timetable(): void
    {
        Sanctum::actingAs($this->activeStudent);

        $response = $this->getJson('/api/v1/student/timetable');

        $response->assertOk();
        $response->assertJsonFragment([
            'code' => 'CS101',
        ]);
    }

    public function test_student_cannot_join_meeting_outside_schedule_window(): void
    {
        Sanctum::actingAs($this->activeStudent);

        // Accessing the meeting endpoint outside of the active class time
        $response = $this->getJson("/api/v1/student/timetables/{$this->timetable->id}/join");

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'code' => 'MEETING_NOT_OPEN',
        ]);
    }

    public function test_student_can_view_published_assignments_and_submit(): void
    {
        Sanctum::actingAs($this->activeStudent);

        $assignment = Assignment::create([
            'teacher_id' => $this->teacher->id,
            'course_id' => $this->course->id,
            'title' => 'Lab 1: PHP Basics',
            'instructions' => 'Complete exercises 1 to 5',
            'max_score' => 100,
            'due_at' => now()->addDays(3),
            'is_published' => true,
            'allow_late' => false,
        ]);

        $listResponse = $this->getJson('/api/v1/student/assignments');
        $listResponse->assertOk();
        $listResponse->assertJsonFragment([
            'title' => 'Lab 1: PHP Basics',
        ]);

        $submitResponse = $this->postJson("/api/v1/student/assignments/{$assignment->id}/submit", [
            'text_entry' => 'https://github.com/student/php-basics-lab1',
        ]);

        $submitResponse->assertOk();
        $this->assertDatabaseHas('submissions', [
            'student_id' => $this->activeStudent->id,
            'assignment_id' => $assignment->id,
            'text_entry' => 'https://github.com/student/php-basics-lab1',
        ]);
    }

    public function test_student_can_view_published_grades(): void
    {
        Sanctum::actingAs($this->activeStudent);

        $assignment = Assignment::create([
            'teacher_id' => $this->teacher->id,
            'course_id' => $this->course->id,
            'title' => 'Midterm Exam',
            'max_score' => 100,
            'due_at' => now()->subDay(),
            'is_published' => true,
        ]);

        Submission::create([
            'student_id' => $this->activeStudent->id,
            'assignment_id' => $assignment->id,
            'text_entry' => 'Completed in exam hall.',
            'submitted_at' => now()->subDay(),
            'score' => 92.50,
            'grades_published' => true,
            'graded_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/student/grades');

        $response->assertOk();
        $response->assertJsonFragment([
            'code' => 'CS101',
            'score' => 92.5,
        ]);
    }
}