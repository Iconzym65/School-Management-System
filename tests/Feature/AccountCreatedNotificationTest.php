<?php

namespace Tests\Feature;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AccountCreatedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountCreatedNotificationTest extends TestCase
{
    use RefreshDatabase;

    private Role $adminRole;

    private Role $teacherRole;

    private Role $studentRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminRole = Role::query()->firstOrCreate(['slug' => RoleSlug::Admin->value], ['name' => 'Admin']);
        $this->teacherRole = Role::query()->firstOrCreate(['slug' => RoleSlug::Teacher->value], ['name' => 'Teacher']);
        $this->studentRole = Role::query()->firstOrCreate(['slug' => RoleSlug::Student->value], ['name' => 'Student']);
    }

    public function test_notification_implements_should_queue_interface(): void
    {
        $this->assertTrue(is_subclass_of(AccountCreatedNotification::class, ShouldQueue::class));
    }

    public function test_notification_renders_teacher_credentials_with_employee_id_and_teacher_login(): void
    {
        $teacher = User::factory()->create([
            'role_id' => $this->teacherRole->id,
            'name' => 'Prof. Kwame Mensah',
            'email' => 'kwame.mensah@example.com',
            'employee_id' => 'EMP-2026-9001',
            'status' => UserStatus::Active,
        ]);

        $notification = new AccountCreatedNotification(
            temporaryPassword: 'TempTeacherSecret123!',
            role: 'teacher'
        );

        $mailMessage = $notification->toMail($teacher);
        $renderedHtml = (string) $mailMessage->render();

        $this->assertSame('Welcome to SHS Vacation Classes - Your Account Details', $mailMessage->subject);
        $this->assertStringContainsString('Hello, Prof. Kwame Mensah', $renderedHtml);
        $this->assertStringContainsString('Employee ID', $renderedHtml);
        $this->assertStringContainsString('EMP-2026-9001', $renderedHtml);
        $this->assertStringContainsString('kwame.mensah@example.com', $renderedHtml);
        $this->assertStringContainsString('TempTeacherSecret123!', $renderedHtml);
        $this->assertStringContainsString('Password Change Required Upon First Login', $renderedHtml);
        $this->assertStringContainsString('/teacher-login', $renderedHtml);
    }

    public function test_notification_renders_student_credentials_with_student_number_and_student_login(): void
    {
        $student = User::factory()->create([
            'role_id' => $this->studentRole->id,
            'name' => 'Abena Osei',
            'email' => 'abena.osei@example.com',
            'student_number' => 'STU-2026-4421',
            'status' => UserStatus::Active,
        ]);

        $notification = new AccountCreatedNotification(
            temporaryPassword: 'TempStudentSecret456!',
            role: 'student'
        );

        $mailMessage = $notification->toMail($student);
        $renderedHtml = (string) $mailMessage->render();

        $this->assertSame('Welcome to SHS Vacation Classes - Your Account Details', $mailMessage->subject);
        $this->assertStringContainsString('Hello, Abena Osei', $renderedHtml);
        $this->assertStringContainsString('Student Number', $renderedHtml);
        $this->assertStringContainsString('STU-2026-4421', $renderedHtml);
        $this->assertStringContainsString('abena.osei@example.com', $renderedHtml);
        $this->assertStringContainsString('TempStudentSecret456!', $renderedHtml);
        $this->assertStringContainsString('Password Change Required Upon First Login', $renderedHtml);
        $this->assertStringContainsString('/login', $renderedHtml);
        $this->assertStringNotContainsString('/teacher-login', $renderedHtml);
    }

    public function test_notification_renders_google_oauth_instructions_when_no_temporary_password_is_provided(): void
    {
        $student = User::factory()->create([
            'role_id' => $this->studentRole->id,
            'name' => 'Kofi Boateng',
            'email' => 'kofi.boateng@gmail.com',
            'student_number' => 'STU-2026-9999',
            'google_id' => 'google-oauth-sub-12345',
            'status' => UserStatus::Active,
        ]);

        $notification = new AccountCreatedNotification(
            temporaryPassword: null,
            role: 'student'
        );

        $mailMessage = $notification->toMail($student);
        $renderedHtml = (string) $mailMessage->render();

        $this->assertStringContainsString('Google Single Sign-On (OAuth) Enabled', $renderedHtml);
        $this->assertStringContainsString('No temporary password was generated for your account', $renderedHtml);
        $this->assertStringContainsString('Sign in with Google', $renderedHtml);
        $this->assertStringNotContainsString('Your Temporary Access Password', $renderedHtml);
        $this->assertStringNotContainsString('Password Change Required Upon First Login', $renderedHtml);
    }

    public function test_admin_teacher_store_endpoint_dispatches_account_created_notification(): void
    {
        Notification::fake();

        $admin = User::factory()->create([
            'role_id' => $this->adminRole->id,
            'status' => UserStatus::Active,
        ]);
        Sanctum::actingAs($admin);

        $payload = [
            'name' => 'Dr. Ama Ansah',
            'email' => 'ama.ansah@example.com',
            'phone' => '+233240001122',
            'employee_id' => 'EMP-2026-T01',
        ];

        $response = $this->postJson('/api/v1/admin/teachers', $payload);

        $response->assertCreated();
        $teacher = User::query()->where('email', 'ama.ansah@example.com')->firstOrFail();

        Notification::assertSentTo(
            $teacher,
            AccountCreatedNotification::class,
            function (AccountCreatedNotification $notification) {
                return ! empty($notification->temporaryPassword);
            }
        );
    }

    public function test_admin_student_store_endpoint_dispatches_account_created_notification(): void
    {
        Notification::fake();

        $admin = User::factory()->create([
            'role_id' => $this->adminRole->id,
            'status' => UserStatus::Active,
        ]);
        Sanctum::actingAs($admin);

        $payload = [
            'name' => 'Yaw Mensah',
            'email' => 'yaw.mensah@example.com',
            'phone' => '+233240003344',
            'student_number' => 'STU-2026-Y01',
        ];

        $response = $this->postJson('/api/v1/admin/students', $payload);

        $response->assertCreated();
        $student = User::query()->where('email', 'yaw.mensah@example.com')->firstOrFail();

        Notification::assertSentTo(
            $student,
            AccountCreatedNotification::class,
            function (AccountCreatedNotification $notification) {
                return ! empty($notification->temporaryPassword);
            }
        );
    }
}
