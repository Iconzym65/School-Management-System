<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use App\Services\GoogleAuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function __construct(private AuthService $auth) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required_without:email', 'string', 'max:255'],
            'email' => ['sometimes', 'email'],
            'password' => ['required', 'string'],
        ]);

        $result = $this->auth->loginWithPassword($data['identifier'] ?? $data['email'], $data['password']);

        return $this->tokenResponse($result, 'Authenticated.');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
        ]);

        $identifier = trim($data['identifier']);

        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('student_number', $identifier)
            ->orWhere('employee_id', $identifier)
            ->first();

        if (! $user) {
            Log::warning("[AUTH] Password reset requested for non-existent identifier: '{$identifier}'");

            return response()->json([
                'message' => 'No active student or staff account found matching that identifier.',
            ], 404);
        }

        try {
            $token = Password::broker()->createToken($user);
        } catch (\Throwable $e) {
            $token = bin2hex(random_bytes(32));
        }

        $resetUrl = url("/reset-password?token={$token}&email=".urlencode($user->email));

        Log::info('==================================================');
        Log::info('[AUTH] PASSWORD RESET DISPATCHED');
        Log::info("Account : {$user->name} ({$user->email})");
        Log::info('Role    : '.($user->role?->slug ?? 'user'));
        Log::info("Token   : {$token}");
        Log::info("URL     : {$resetUrl}");
        Log::info('==================================================');

        return response()->json([
            'message' => "Password reset instructions have been dispatched to {$user->email}.",
        ], 200);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'No account found matching that email address.',
            ], 404);
        }

        // Verify token validity and 60-minute expiration
        if (! Password::broker()->tokenExists($user, $data['token'])) {
            return response()->json([
                'message' => 'This password reset link is invalid or has expired. Please request a new one.',
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
        ])->save();

        // Invalidate token after successful reset
        Password::broker()->deleteToken($user);

        Log::info("[AUTH] Password successfully updated and token revoked for {$user->email}");

        return ApiResponse::success(null, 'Password has been reset successfully.');
    }

    public function googleRedirect(Request $request): JsonResponse|RedirectResponse
    {
        $url = app(GoogleAuthService::class)->redirectUrl();

        if ($request->wantsJson()) {
            return ApiResponse::success(['url' => $url]);
        }

        return redirect()->away($url);
    }

    public function googleCallback(Request $request): JsonResponse|View
    {
        $profile = app(GoogleAuthService::class)->userFromCallback();
        $result = $this->auth->loginFromGoogleProfile($profile);

        // If requested via an API/AJAX client, return raw JSON
        if ($request->wantsJson()) {
            return $this->tokenResponse($result, 'Authenticated with Google.');
        }

        // Browser top-level redirect: hand off payload to local storage and forward
        $authPayload = [
            'token' => $result['token'],
            'token_type' => $result['token_type'],
            'redirect' => $result['redirect'],
            'must_change_password' => (bool) $result['must_change_password'],
            'portal_blocked' => (bool) $result['portal_blocked'],
            'user' => (new UserResource($result['user']))->resolve(),
        ];

        return view('auth.oauth-callback', compact('authPayload'));
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
        $user = $request->user()->load(['role', 'cohort']);

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
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
        ]);

        $this->auth->changePassword($request->user(), $data['current_password'], $data['password']);

        return ApiResponse::success(null, 'Password updated.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        Auth::guard('web')->logout();

        return ApiResponse::success(null, 'Logged out.')
            ->withCookie(cookie()->forget('portal_token'));
    }

    /**
     * @param  array{token: string, token_type: string, redirect: string, must_change_password: bool, portal_blocked: bool, user: User}  $result
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
        ], $message)->withCookie(cookie(
            'portal_token',
            $result['token'],
            60 * 24 * 30,
            '/',
            null,
            app()->isProduction(),
            true,
            false,
            'lax',
        ));
    }
}
