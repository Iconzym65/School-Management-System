<?php

return [
    'attendance_edit_window_hours' => (int) env('SMS_ATTENDANCE_EDIT_WINDOW_HOURS', 48),
    'meeting_link_opens_minutes_before' => (int) env('SMS_MEETING_LINK_OPENS_MINUTES', 10),
    'assignment_max_kilobytes' => (int) env('SMS_ASSIGNMENT_MAX_KB', 20480),
    'allowed_assignment_mimes' => [
        'pdf',
        'doc',
        'docx',
        'txt',
        'zip',
    ],
    'temp_password_length' => 12,
    'gpa_scale' => 4.0,
];
