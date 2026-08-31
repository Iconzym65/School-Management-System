<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return ApiResponse::success([
            'attendance_edit_window_hours' => (int) Setting::getValue(
                'attendance_edit_window_hours',
                config('sms.attendance_edit_window_hours')
            ),
            'meeting_link_opens_minutes_before' => (int) Setting::getValue(
                'meeting_link_opens_minutes_before',
                config('sms.meeting_link_opens_minutes_before')
            ),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'attendance_edit_window_hours' => ['sometimes', 'integer', 'min:1', 'max:168'],
            'meeting_link_opens_minutes_before' => ['sometimes', 'integer', 'min:0', 'max:120'],
        ]);

        foreach ($data as $key => $value) {
            Setting::setValue($key, $value);
        }

        return $this->index();
    }
}
