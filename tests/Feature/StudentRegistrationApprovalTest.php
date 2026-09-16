<?php

namespace Tests\Feature;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Models\Cohort;
use App\Models\Course;
use App\Models\Role;
use App\Models\StudentApplication;
use App\Models\User;
use App\Notifications\StudentApplicationApproved;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentRegistrationApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_open_a_protected_portal(): void
    {
        $this->get('/admin-portal')->assertRedirectToRoute('login');
    }

    public function test_role_login_pages_are_available_to_guests(): void
    {
        $this->get('/admin-login')->assertOk()->assertSee('admin-login-root', false);
        $this->get('/teacher-login')->assertOk()->assertSee('teacher-login-root', false);
    }

    public function test_authenticated_admin_can_open_the_admin_portal_with_login_cookie(): void
    {
        $role = Role::query()->firstOrCreate(['slug' => RoleSlug::Admin->value], ['name' => 'Admin']);
        $admin = User::factory()->create([
            'role_id' => $role->id,
            'email' => 'portal-admin@example.test',
            'password' => 'StrongPass123',
            'status' => UserStatus::Active,
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'identifier' => $admin->email,
            'password' => 'StrongPass123',
        ]);

        $login->assertOk()->assertCookie('portal_token');
        $login->assertJsonPath('data.redirect', '/admin-portal');
        $this->withUnencryptedCookie('portal_token', $login->json('data.token'))
            ->get('/admin-portal')
            ->assertOk()
            ->assertSee('admin-portal-root', false);
    }

    public function test_user_with_the_wrong_role_cannot_open_the_admin_portal(): void
    {
        $role = Role::query()->firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);
        $student = User::factory()->create([
            'role_id' => $role->id,
            'status' => UserStatus::Active,
        ]);

        $this->actingAs($student)->get('/admin-portal')->assertRedirectToRoute('login');
    }

    public function test_registration_creates_a_pending_application(): void
    {
        [$cohort, $course] = $this->registrationData();

        $response = $this->postJson('/api/v1/public/student/register', [
            ...$this->applicationPayload($cohort, $course),
            'password' => 'StrongPass123',
            'password_confirmation' => 'StrongPass123',
            'declaration_confirmed' => true,
            'privacy_accepted' => true,
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'PENDING_APPROVAL');
        $this->assertDatabaseHas('student_applications', [
            'student_email' => 'candidate@example.test',
            'status' => 'PENDING_APPROVAL',
        ]);
    }

    public function test_admin_approval_creates_and_enrolls_an_active_student(): void
    {
        Notification::fake();
        [$cohort, $course] = $this->registrationData();
        Role::query()->firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);
        $application = StudentApplication::query()->create([
            ...$this->applicationPayload($cohort, $course),
            'password' => bcrypt('StrongPass123'),
            'status' => 'PENDING_APPROVAL',
        ]);
        $admin = User::factory()->create([
            'role_id' => Role::query()->firstOrCreate(['slug' => RoleSlug::Admin->value], ['name' => 'Admin'])->id,
            'status' => UserStatus::Active,
        ]);
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/admin/student-applications/{$application->id}/approve", [
            'status' => UserStatus::Active->value,
        ]);

        $response->assertOk()->assertJsonPath('data.student.status', UserStatus::Active->value);
        $student = User::query()->where('email', 'candidate@example.test')->firstOrFail();
        $this->assertNotNull($student->student_number);
        $this->assertDatabaseHas('enrollments', [
            'student_id' => $student->id,
            'course_id' => $course->id,
        ]);
        Notification::assertSentTo($student, StudentApplicationApproved::class);
    }

    public function test_student_can_log_in_with_student_number_after_approval(): void
    {
        $role = Role::query()->firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);
        $student = User::factory()->create([
            'role_id' => $role->id,
            'student_number' => 'STU-2026-TEST',
            'password' => 'StrongPass123',
            'status' => UserStatus::Active,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => $student->student_number,
            'password' => 'StrongPass123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.student_number', 'STU-2026-TEST')
            ->assertJsonPath('data.redirect', '/student-portal');
    }

    public function test_teacher_can_log_in_with_employee_id(): void
    {
        $role = Role::query()->firstOrCreate(['slug' => RoleSlug::Teacher->value], ['name' => 'Teacher']);
        $teacher = User::factory()->create([
            'role_id' => $role->id,
            'employee_id' => 'STF-2026-TEST',
            'password' => 'StrongPass123',
            'status' => UserStatus::Active,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => $teacher->employee_id,
            'password' => 'StrongPass123',
        ]);

        $response->assertOk()->assertJsonPath('data.user.employee_id', 'STF-2026-TEST');
    }

    private function registrationData(): array
    {
        $cohort = Cohort::query()->create([
            'name' => 'September Vacation Batch',
            'code' => 'VAC-2026-SEP',
            'starts_on' => '2026-09-01',
            'ends_on' => '2026-09-30',
            'is_active' => true,
        ]);
        $course = Course::query()->create([
            'cohort_id' => $cohort->id,
            'code' => 'REG101',
            'title' => 'Registration Course',
            'credit_hours' => 3,
        ]);

        return [$cohort, $course];
    }

    private function applicationPayload(Cohort $cohort, Course $course): array
    {
        return [
            'cohort_id' => $cohort->id,
            'first_name' => 'Ada',
            'last_name' => 'Candidate',
            'gender' => 'Female',
            'dob' => '2000-01-01',
            'student_phone' => '0240000000',
            'student_email' => 'candidate@example.test',
            'residential_address' => '1 School Road',
            'previous_institution' => 'Example School',
            'current_level' => 'Level 200',
            'stream_track' => 'Science',
            'selected_courses' => [$course->id],
            'guardian_name' => 'Parent Candidate',
            'guardian_relationship' => 'Parent',
        ];
    }
}
