<?php

namespace App\Services;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AccountCreatedNotification;
use App\Support\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(private GoogleAuthService $googleAuth) {}

    public function loginWithPassword(string $identifier, string $password): array
    {
        $user = User::query()
            ->with('role')
            ->where(fn ($query) => $query
                ->where('email', $identifier)
                ->orWhere('student_number', $identifier)
                ->orWhere('employee_id', $identifier))
            ->first();

        if (! $user || ! $user->password || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status === UserStatus::Suspended) {
            throw new HttpResponseException(
                ApiResponse::error('This account has been suspended.', 403, 'ACCOUNT_SUSPENDED'),
            );
        }

        if ($user->status !== UserStatus::Active && $user->isStudent()) {
            throw new HttpResponseException(
                ApiResponse::error(
                    'Your student account is awaiting payment or administrative clearance.',
                    403,
                    'STUDENT_INACTIVE',
                    ['status' => $user->status->value],
                ),
            );
        }

        return $this->issueToken($user, 'password');
    }

    public function loginWithGoogleIdToken(string $idToken): array
    {
        $profile = $this->googleAuth->verifyIdToken($idToken);

        return $this->loginFromGoogleProfile($profile);
    }

    public function loginWithGoogleAccessToken(string $accessToken): array
    {
        $profile = $this->googleAuth->userFromAccessToken($accessToken);

        return $this->loginFromGoogleProfile($profile);
    }

    /**
     * @param  array{id: string, email: string, name: string|null}  $profile
     */
    public function loginFromGoogleProfile(array $profile): array
    {
        $user = User::query()->with('role')->where('email', $profile['email'])->first();

        if (! $user) {
            abort(403, 'No school account is provisioned for this Google identity.');
        }

        $user->forceFill([
            'google_id' => $profile['id'],
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        return $this->issueToken($user->fresh('role'), 'google');
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if ($user->password && ! Hash::check($currentPassword, $user->password) && ! $user->must_change_password) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        if ($user->must_change_password && $user->password && ! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The temporary password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => $newPassword,
            'must_change_password' => false,
        ])->save();
    }

    /**
     * @return array{token: string, token_type: string, user: User, redirect: string}
     */
    public function issueToken(User $user, string $deviceName): array
    {
        Auth::guard('web')->login($user);
        $user->tokens()->where('name', $deviceName)->delete();

        $abilities = match ($user->role?->slug) {
            RoleSlug::Admin->value => ['*'],
            RoleSlug::Teacher->value => ['teacher'],
            default => ['student'],
        };

        $token = $user->createToken($deviceName, $abilities)->plainTextToken;

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'redirect' => $user->dashboardPath(),
            'must_change_password' => (bool) $user->must_change_password,
            'portal_blocked' => $user->isStudent() && $user->status !== UserStatus::Active,
            'user' => $user,
        ];
    }

    public static function roleId(RoleSlug $slug): int
    {
        return (int) Role::query()->where('slug', $slug->value)->valueOrFail('id');
    }

    /**
     * Dispatch the queued welcome account creation notification to a user.
     */
    public function sendAccountCreatedNotification(User $user, ?string $temporaryPassword = null): void
    {
        $user->notify(new AccountCreatedNotification($temporaryPassword));
    }
}
