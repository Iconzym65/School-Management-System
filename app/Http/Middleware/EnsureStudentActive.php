<?php

namespace App\Http\Middleware;

use App\Enums\UserStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStudentActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->isStudent() && $user->status !== UserStatus::Active) {
            return response()->json([
                'message' => 'Portal access is blocked until administrative and financial clearance is confirmed.',
                'code' => 'STUDENT_INACTIVE',
                'status' => $user->status->value,
            ], 403);
        }

        return $next($request);
    }
}
