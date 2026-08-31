<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Timetable;
use App\Services\AttendanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceOverrideController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    public function store(Request $request, Timetable $timetable): JsonResponse
    {
        $data = $request->validate([
            'session_date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:users,id'],
            'records.*.status' => ['required', 'in:PRESENT,ABSENT,LATE,EXCUSED'],
            'records.*.notes' => ['nullable', 'string'],
        ]);

        $this->attendance->markForSession(
            $timetable->load('course'),
            Carbon::parse($data['session_date']),
            $request->user(),
            $data['records'],
            overrideWindow: true,
        );

        return ApiResponse::success(null, 'Attendance overridden.');
    }
}
