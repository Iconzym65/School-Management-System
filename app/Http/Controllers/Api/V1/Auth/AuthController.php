<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private AuthService $auth) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $result = $this->auth->loginWithPassword($data['email'], $data['password']);

        return $this->tokenResponse($result, 'Authenticated.');
    }

    public function googleRedirect(): JsonResponse
    {
        return ApiResponse::success([
            'url' => app(\App\Services\GoogleAuthService::class)->redirectUrl(),
        ]);
    }

    public function googleCallback(): JsonResponse
    {
        $profile = app(\App\Services\GoogleAuthService::class)->userFromCallback();
        $result = $this->auth->loginFromGoogleProfile($profile);

        return $this->tokenResponse($result, 'Authenticated with Google.');
    }

    public function googleToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => ['required_without:access_token', 'string'],
            'access_token' => ['required_without:id_token', 'string'],
        ]);

        $result = isset($data['id_token'])
            ? $this->auth->loginWithGoogleIdToken($data['id_token'])
            : $this->auth->loginWithGoogleAccessToken($data['access_token']);

        return $this->tokenResponse($result, 'Authenticated with Google.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return ApiResponse::success([
            'user' => new UserResource($user),
            'redirect' => $user->dashboardPath(),
            'must_change_password' => (bool) $user->must_change_password,
            'portal_blocked' => $user->isStudent() && ! $user->status->isPortalAllowed(),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $this->auth->changePassword($request->user(), $data['current_password'], $data['password']);

        return ApiResponse::success(null, 'Password updated.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Logged out.');
    }

    /**
     * @param  array{token: string, token_type: string, redirect: string, must_change_password: bool, portal_blocked: bool, user: \App\Models\User}  $result
     */
    private function tokenResponse(array $result, string $message): JsonResponse
    {
        return ApiResponse::success([
            'token' => $result['token'],
            'token_type' => $result['token_type'],
            'redirect' => $result['redirect'],
            'must_change_password' => $result['must_change_password'],
            'portal_blocked' => $result['portal_blocked'],
            'user' => new UserResource($result['user']),
        ], $message);
    }
}
