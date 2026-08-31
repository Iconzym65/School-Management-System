<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

class GoogleAuthService
{
    /**
     * @return array{id: string, email: string, name: string|null}
     */
    public function verifyIdToken(string $idToken): array
    {
        $response = Http::asForm()->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->ok()) {
            abort(401, 'Google identity token is invalid.');
        }

        $payload = $response->json();
        $clientId = config('services.google.client_id');

        if ($clientId && ($payload['aud'] ?? null) !== $clientId) {
            abort(401, 'Google identity token audience mismatch.');
        }

        if (empty($payload['email']) || empty($payload['sub'])) {
            abort(401, 'Google identity token is missing required claims.');
        }

        return [
            'id' => (string) $payload['sub'],
            'email' => (string) $payload['email'],
            'name' => $payload['name'] ?? null,
        ];
    }

    /**
     * @return array{id: string, email: string, name: string|null}
     */
    public function userFromAccessToken(string $accessToken): array
    {
        /** @var SocialiteUser $googleUser */
        $googleUser = Socialite::driver('google')->stateless()->userFromToken($accessToken);

        return [
            'id' => (string) $googleUser->getId(),
            'email' => (string) $googleUser->getEmail(),
            'name' => $googleUser->getName(),
        ];
    }

    public function redirectUrl(): string
    {
        return Socialite::driver('google')
            ->stateless()
            ->scopes(['openid', 'profile', 'email'])
            ->redirect()
            ->getTargetUrl();
    }

    /**
     * @return array{id: string, email: string, name: string|null}
     */
    public function userFromCallback(): array
    {
        /** @var SocialiteUser $googleUser */
        $googleUser = Socialite::driver('google')->stateless()->user();

        return [
            'id' => (string) $googleUser->getId(),
            'email' => (string) $googleUser->getEmail(),
            'name' => $googleUser->getName(),
        ];
    }
}
