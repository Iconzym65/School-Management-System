<?php

namespace Database\Seeders;

use App\Enums\UserStatus;
use App\Models\Cohort;
use App\Models\Course;
use App\Models\Role;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class VacationClassesSeeder extends Seeder
{
    public function run(): void
    {
        $sharedPassword = 'Password123!';
        $hashedPassword = Hash::make($sharedPassword);

        // 1. Roles
        $teacherRole = Role::firstOrCreate(['slug' => 'teacher'], ['name' => 'Teacher']);
        $studentRole = Role::firstOrCreate(['slug' => 'student'], ['name' => 'Student']);

        // 2. Active Vacation Cohort
        $cohort = Cohort::firstOrCreate(
            ['code' => 'VAC-2026-AUG'],
            [
                'name' => 'August 2026 SHS Vacation Classes',
                'starts_on' => '2026-08-01',
                'ends_on' => '2026-09-30',
                'is_active' => true,
            ]
        );

        // 3. Status resolution
        $activeStatus = enum_exists('\App\Enums\UserStatus')
            ? UserStatus::Active
            : 'ACTIVE';

        $inactiveStatus = enum_exists('\App\Enums\UserStatus')
            ? (UserStatus::tryFrom('INACTIVE_PAYMENT_PENDING') ?? UserStatus::cases()[1] ?? $activeStatus)
            : 'INACTIVE_PAYMENT_PENDING';

        // 4. Create 7 Teachers (Clearing any conflicting employee_id from prior runs)
        $teacherData = [
            ['name' => 'Mr. Kwame Mensah', 'email' => 'teacher1@school.edu', 'phone' => '+233541110001'],
            ['name' => 'Mrs. Ama Serwaa', 'email' => 'teacher2@school.edu', 'phone' => '+233541110002'],
            ['name' => 'Mr. Kofi Owusu', 'email' => 'teacher3@school.edu', 'phone' => '+233541110003'],
            ['name' => 'Ms. Akua Asante', 'email' => 'teacher4@school.edu', 'phone' => '+233541110004'],
            ['name' => 'Mr. Yaw Boateng', 'email' => 'teacher5@school.edu', 'phone' => '+233541110005'],
            ['name' => 'Mrs. Abena Osei', 'email' => 'teacher6@school.edu', 'phone' => '+233541110006'],
            ['name' => 'Mr. Kwadwo Appiah', 'email' => 'teacher7@school.edu', 'phone' => '+233541110007'],
        ];

        $teachers = [];
        foreach ($teacherData as $index => $data) {
            $employeeId = 'TCH-2026-'.str_pad($index + 1, 3, '0', STR_PAD_LEFT);

            // Remove any legacy user record occupying this employee_id under a different email
            User::where('employee_id', $employeeId)
                ->where('email', '!=', $data['email'])
                ->delete();

            $teachers[] = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'phone' => $data['phone'],
                    'employee_id' => $employeeId,
                    'role_id' => $teacherRole->id,
                    'password' => $hashedPassword,
                    'status' => $activeStatus,
                    'must_change_password' => false,
                ]
            );
        }

        // 5. Create 7 Subjects & Timetable Slots
        $subjects = [
            ['code' => 'CORE-MATH', 'title' => 'Core Mathematics', 'day' => 'MONDAY', 'start' => '09:00', 'end' => '10:30'],
            ['code' => 'ENG-LANG', 'title' => 'English Language', 'day' => 'MONDAY', 'start' => '11:00', 'end' => '12:30'],
            ['code' => 'INT-SCI', 'title' => 'Integrated Science', 'day' => 'TUESDAY', 'start' => '09:00', 'end' => '10:30'],
            ['code' => 'SOC-STUD', 'title' => 'Social Studies', 'day' => 'TUESDAY', 'start' => '11:00', 'end' => '12:30'],
            ['code' => 'ELECT-MATH', 'title' => 'Elective Mathematics', 'day' => 'WEDNESDAY', 'start' => '09:00', 'end' => '10:30'],
            ['code' => 'PHYS-101', 'title' => 'Physics', 'day' => 'THURSDAY', 'start' => '09:00', 'end' => '10:30'],
            ['code' => 'CHEM-101', 'title' => 'Chemistry', 'day' => 'FRIDAY', 'start' => '09:00', 'end' => '10:30'],
        ];

        $courses = [];
        foreach ($subjects as $index => $subj) {
            $assignedTeacher = $teachers[$index];

            $coursePayload = [
                'title' => $subj['title'],
                'credit_hours' => 3,
                'cohort_id' => $cohort->id,
                'description' => "SHS Vacation Class syllabus for {$subj['title']}.",
            ];

            if (Schema::hasColumn('courses', 'teacher_id')) {
                $coursePayload['teacher_id'] = $assignedTeacher->id;
            }

            $course = Course::updateOrCreate(['code' => $subj['code']], $coursePayload);
            $courses[] = $course;

            $timetableData = [
                'teacher_id' => $assignedTeacher->id,
                'start_time' => $subj['start'],
                'end_time' => $subj['end'],
                'classroom' => 'Online Studio '.($index + 1),
                'delivery_mode' => 'VIRTUAL',
                'meeting_link' => 'https://zoom.us/j/900'.rand(100000, 999999),
                'meeting_opens_minutes_before' => 15,
            ];

            if (Schema::hasColumn('timetables', 'virtual_platform')) {
                $timetableData['virtual_platform'] = 'zoom';
            }

            Timetable::updateOrCreate(
                [
                    'course_id' => $course->id,
                    'day_of_week' => $subj['day'],
                ],
                $timetableData
            );
        }

        // 6. Create 20 Students & Enrollments (Clearing any conflicting student_number)
        $studentNames = [
            'Isaac Kobina Ayerakwah', 'Chloe Vance', 'David Miller', 'Abena Pokuaa',
            'Kofi Badu', 'Esi Mensah', 'Emmanuel Ofori', 'Grace Antwi',
            'Samuel Darko', 'Priscilla Baah', 'Daniel Tetteh', 'Mercy Kusi',
            'Stephen Agyeman', 'Rita Frimpong', 'Benjamin Arthur', 'Felicia Boadi',
            'Michael Nkrumah', 'Sarah Quaye', 'Joshua Amponsah', 'Eunice Sarpong',
        ];

        foreach ($studentNames as $index => $name) {
            $num = $index + 1;
            $email = "student{$num}@school.test";
            $studentNumber = 'STU-2026-'.str_pad($num, 4, '0', STR_PAD_LEFT);
            $status = $num <= 15 ? $activeStatus : $inactiveStatus;

            // Remove any legacy user record occupying this student_number under a different email
            User::where('student_number', $studentNumber)
                ->where('email', '!=', $email)
                ->delete();

            $student = User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => '+23324000'.str_pad($num, 4, '0', STR_PAD_LEFT),
                    'student_number' => $studentNumber,
                    'role_id' => $studentRole->id,
                    'password' => $hashedPassword,
                    'status' => $status,
                    'cohort_id' => $cohort->id,
                    'must_change_password' => false,
                ]
            );

            if (Schema::hasTable('enrollments')) {
                foreach ($courses as $course) {
                    DB::table('enrollments')->updateOrInsert(
                        [
                            'student_id' => $student->id,
                            'course_id' => $course->id,
                        ],
                        [
                            'status' => 'ENROLLED',
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }
            }
        }
    }
}
