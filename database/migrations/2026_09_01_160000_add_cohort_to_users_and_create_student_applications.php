<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('cohort_id')->nullable()->after('role_id')->constrained('cohorts')->nullOnDelete();
        });

        Schema::create('student_applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('cohort_id')->constrained('cohorts')->cascadeOnDelete();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('gender', 32);
            $table->date('dob');
            $table->string('student_phone', 32);
            $table->string('student_email')->unique();
            $table->text('residential_address');
            $table->string('city', 100)->nullable();
            $table->string('previous_institution', 255);
            $table->string('current_level', 100);
            $table->string('stream_track', 100);
            $table->string('student_id_reference', 100)->nullable();
            $table->json('selected_courses');
            $table->string('guardian_name', 255);
            $table->string('guardian_relationship', 100);
            $table->string('guardian_email')->nullable();
            $table->string('guardian_phone', 32)->nullable();
            $table->string('guardian_whatsapp', 32)->nullable();
            $table->string('password');
            $table->string('status', 32)->default('PENDING_APPROVAL')->index();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_applications');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('cohort_id');
        });
    }
};
