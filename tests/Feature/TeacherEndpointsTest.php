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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeacherEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected Role $studentRole;
    protected Role $teacherRole;
    protected User $student;
    protected User $teacher;
    protected User $otherTeacher;
    protected Course $course;
    protected Timetable $timetable;

    protected function setUp(): void
    {
        parent::setUp();

        $this->studentRole = Role::firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);
        $this->teacherRole = Role::firstOrCreate(['slug' => RoleSlug::Teacher->value], ['name' => 'Teacher']);

        $this->student = User::factory()->create([
            'role_id' => $this->studentRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);

        $this->teacher = User::factory()->create([
            'role_id' => $this->teacherRole->id,
            'status' => UserStatus::Active,
            'must_change_password' => false,
        ]);

        $this->otherTeacher = User::factory()->create([
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
            'student_id' => $this->student->id,
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

    public function test_teacher_can_view_today_schedule(): void
    {
        Sanctum::actingAs($this->teacher);

        $response = $this->getJson('/api/v1/teacher/dashboard/today');

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data',
        ]);
    }

    public function test_teacher_can_view_timetable(): void
    {
        Sanctum::actingAs($this->teacher);

        $response = $this->getJson('/api/v1/teacher/timetable');

        $response->assertOk();
        $response->assertJsonFragment([
            'teacher_id' => $this->teacher->id,
        ]);
    }

    public function test_teacher_can_view_courses(): void
    {
        Sanctum::actingAs($this->teacher);

        $response = $this->getJson('/api/v1/teacher/courses');

        $response->assertOk();
        $response->assertJsonFragment([
            'code' => 'CS101',
        ]);
    }

    public function test_teacher_can_view_course_gradebook(): void
    {
        Sanctum::actingAs($this->teacher);

        $response = $this->getJson("/api/v1/teacher/courses/{$this->course->id}/gradebook");

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data' => [
                'students',
                'assignments',
            ],
        ]);
    }

    public function test_other_teacher_cannot_view_course_gradebook(): void
    {
        Sanctum::actingAs($this->otherTeacher);

        $response = $this->getJson("/api/v1/teacher/courses/{$this->course->id}/gradebook");

        $response->assertStatus(403);
    }

    public function test_teacher_can_view_attendance_roster(): void
    {
        Sanctum::actingAs($this->teacher);

        $response = $this->getJson("/api/v1/teacher/timetables/{$this->timetable->id}/attendance?session_date=2026-09-07");

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data' => [
                'timetable',
                'session_date',
                'roster',
            ],
        ]);
    }

    public function test_teacher_can_save_attendance(): void
    {
        Sanctum::actingAs($this->teacher);

        $response = $this->postJson("/api/v1/teacher/timetables/{$this->timetable->id}/attendance", [
            'session_date' => '2026-09-07',
            'records' => [
                [
                    'student_id' => $this->student->id,
                    'status' => 'PRESENT',
                    'notes' => 'Attended class.',
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('attendances', [
            'timetable_id' => $this->timetable->id,
            'student_id' => $this->student->id,
            'session_date' => '2026-09-07',
            'status' => 'PRESENT',
        ]);
    }

    public function test_teacher_can_manage_assignments(): void
    {
        Sanctum::actingAs($this->teacher);

        // 1. Store
        $response = $this->postJson('/api/v1/teacher/assignments', [
            'course_id' => $this->course->id,
            'title' => 'Lab 2: PHP advanced',
            'instructions' => 'Advanced stuff.',
            'max_score' => 100,
            'due_at' => now()->addDays(5)->toDateTimeString(),
            'is_published' => true,
            'allow_late' => true,
        ]);

        $response->assertStatus(201);
        $assignmentId = $response->json('data.id');

        // 2. Index
        $indexResponse = $this->getJson('/api/v1/teacher/assignments');
        $indexResponse->assertOk();
        $indexResponse->assertJsonFragment([
            'id' => $assignmentId,
            'title' => 'Lab 2: PHP advanced',
        ]);

        // 3. Show
        $showResponse = $this->getJson("/api/v1/teacher/assignments/{$assignmentId}");
        $showResponse->assertOk();
        $showResponse->assertJsonFragment([
            'title' => 'Lab 2: PHP advanced',
        ]);

        // 4. Update
        $updateResponse = $this->putJson("/api/v1/teacher/assignments/{$assignmentId}", [
            'title' => 'Lab 2: Refined',
        ]);
        $updateResponse->assertOk();
        $this->assertDatabaseHas('assignments', [
            'id' => $assignmentId,
            'title' => 'Lab 2: Refined',
        ]);

        // 5. Delete
        $deleteResponse = $this->deleteJson("/api/v1/teacher/assignments/{$assignmentId}");
        $deleteResponse->assertOk();
        $this->assertDatabaseMissing('assignments', [
            'id' => $assignmentId,
        ]);
    }

    public function test_teacher_can_grade_and_publish_submissions(): void
    {
        Sanctum::actingAs($this->teacher);

        $assignment = Assignment::create([
            'teacher_id' => $this->teacher->id,
            'course_id' => $this->course->id,
            'title' => 'Project Draft',
            'instructions' => 'Draft submission',
            'max_score' => 50,
            'due_at' => now()->addDays(3),
            'is_published' => true,
            'allow_late' => false,
        ]);

        $submission = Submission::create([
            'student_id' => $this->student->id,
            'assignment_id' => $assignment->id,
            'text_entry' => 'Draft link',
            'submitted_at' => now(),
        ]);

        // Index submissions
        $indexResponse = $this->getJson("/api/v1/teacher/assignments/{$assignment->id}/submissions");
        $indexResponse->assertOk();
        $indexResponse->assertJsonFragment([
            'id' => $submission->id,
            'text_entry' => 'Draft link',
        ]);

        // Grade submission
        $gradeResponse = $this->postJson("/api/v1/teacher/submissions/{$submission->id}/grade", [
            'score' => 45,
            'feedback' => 'Good effort.',
            'grades_published' => false,
        ]);

        $gradeResponse->assertOk();
        $this->assertDatabaseHas('submissions', [
            'id' => $submission->id,
            'score' => 45.00,
            'feedback' => 'Good effort.',
        ]);

        // Publish grades
        $publishResponse = $this->postJson("/api/v1/teacher/assignments/{$assignment->id}/publish-grades", [
            'grades_published' => true,
        ]);

        $publishResponse->assertOk();
        $this->assertDatabaseHas('submissions', [
            'id' => $submission->id,
            'grades_published' => true,
        ]);
    }

    public function test_teacher_can_download_submission_file(): void
    {
        Storage::fake('assignments');
        UploadedFile::fake()->create('submission.pdf', 100)->storeAs('student-submissions', 'submission.pdf', 'assignments');

        $assignment = Assignment::create([
            'teacher_id' => $this->teacher->id,
            'course_id' => $this->course->id,
            'title' => 'Project File',
            'max_score' => 50,
            'due_at' => now()->addDays(3),
            'is_published' => true,
        ]);

        $submission = Submission::create([
            'student_id' => $this->student->id,
            'assignment_id' => $assignment->id,
            'file_url' => 'student-submissions/submission.pdf',
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($this->teacher);

        $response = $this->getJson("/api/v1/teacher/submissions/{$submission->id}/file");
        $response->assertOk();
    }
}
