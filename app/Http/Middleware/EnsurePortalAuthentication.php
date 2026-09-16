<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortalAuthentication
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            $token = $request->cookie('portal_token');
            $accessToken = $token ? PersonalAccessToken::findToken($token) : null;

            if ($accessToken?->tokenable) {
                $user = $accessToken->tokenable;
                $request->setUserResolver(fn () => $user);
            }
        }

        if (! $request->user()) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
