<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cohort;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CohortController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cohorts = Cohort::query()
            ->withCount('courses')
            ->when($request->has('active'), fn ($query) => $query->where('is_active', $request->boolean('active')))
            ->orderBy('starts_on', 'desc')
            ->get();

        return ApiResponse::success($cohorts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:32', 'unique:cohorts,code'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $cohort = Cohort::query()->create($data);

        if ($cohort->is_active) {
            Cohort::query()->whereKeyNot($cohort->id)->update(['is_active' => false]);
        }

        return ApiResponse::success($cohort->loadCount('courses'), 'Cohort created.', 201);
    }

    public function show(Cohort $cohort): JsonResponse
    {
        return ApiResponse::success($cohort->loadCount('courses')->load('courses'));
    }

    public function update(Request $request, Cohort $cohort): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'code' => ['sometimes', 'string', 'max:32', Rule::unique('cohorts', 'code')->ignore($cohort->id)],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date', 'after_or_equal:starts_on'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $cohort->update($data);

        if ($cohort->is_active) {
            Cohort::query()->whereKeyNot($cohort->id)->update(['is_active' => false]);
        }

        return ApiResponse::success($cohort->fresh()->loadCount('courses'), 'Cohort updated.');
    }

    public function destroy(Cohort $cohort): JsonResponse
    {
        $cohort->delete();

        return ApiResponse::success(null, 'Cohort deleted.');
    }
}
