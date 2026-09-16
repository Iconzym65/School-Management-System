<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cohort_id' => ['required', 'integer', Rule::exists('cohorts', 'id')->where('is_active', true)],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['required', 'string', 'max:32'],
            'dob' => ['required', 'date', 'before:today'],
            'student_phone' => ['required', 'string', 'max:32'],
            'student_email' => ['required', 'email', 'max:255', 'unique:student_applications,student_email', 'unique:users,email'],
            'residential_address' => ['required', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:100'],
            'previous_institution' => ['required', 'string', 'max:255'],
            'current_level' => ['required', 'string', 'max:100'],
            'stream_track' => ['required', 'string', 'max:100'],
            'student_id_reference' => ['nullable', 'string', 'max:100'],
            'selected_courses' => ['required', 'array', 'min:1'],
            'selected_courses.*' => ['integer', Rule::exists('courses', 'id')->where(fn ($query) => $query->where('cohort_id', $this->integer('cohort_id')))],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_relationship' => ['required', 'string', 'max:100'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:32'],
            'guardian_whatsapp' => ['nullable', 'string', 'max:32'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'declaration_confirmed' => ['accepted'],
            'privacy_accepted' => ['accepted'],
        ];
    }
}
