<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->must_change_password) {
            return response()->json([
                'message' => 'You must change your temporary password before continuing.',
                'code' => 'MUST_CHANGE_PASSWORD',
                'redirect' => '/auth/change-password',
            ], 403);
        }

        return $next($request);
    }
}
