<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        return ApiResponse::success(Department::query()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'unique:departments,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        return ApiResponse::success(Department::query()->create($data), 'Department created.', 201);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:32', Rule::unique('departments', 'code')->ignore($department->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $department->update($data);

        return ApiResponse::success($department->fresh(), 'Department updated.');
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return ApiResponse::success(null, 'Department deleted.');
    }
}
