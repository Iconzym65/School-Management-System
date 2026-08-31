<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Semester;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SemesterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $semesters = Semester::query()
            ->with('academicYear')
            ->when($request->integer('academic_year_id'), fn ($q, $id) => $q->where('academic_year_id', $id))
            ->latest('starts_on')
            ->get();

        return ApiResponse::success($semesters);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'name' => ['required', 'string', 'max:64'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after:starts_on'],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        $semester = Semester::query()->create($data);

        if ($semester->is_current) {
            Semester::query()->where('id', '!=', $semester->id)->update(['is_current' => false]);
        }

        return ApiResponse::success($semester, 'Semester created.', 201);
    }

    public function update(Request $request, Semester $semester): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:64'],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date', 'after:starts_on'],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        $semester->update($data);

        if ($semester->is_current) {
            Semester::query()->where('id', '!=', $semester->id)->update(['is_current' => false]);
        }

        return ApiResponse::success($semester->fresh(), 'Semester updated.');
    }

    public function destroy(Semester $semester): JsonResponse
    {
        $semester->delete();

        return ApiResponse::success(null, 'Semester deleted.');
    }
}
