<?php

namespace Database\Seeders;

use App\Enums\RoleSlug;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Ensure the Administrator Role Exists
        $adminRole = Role::firstOrCreate(
            ['slug' => RoleSlug::Admin?->value ?? 'admin'],
            ['name' => 'Administrator']
        );

        // 2. Define Permanent Admin Accounts
        $admins = [
            [
                'name' => 'Primary System Administrator',
                'email' => 'ayerakwahisaackobina@gmail.com',
                'phone' => '+233 53 709 9455',
                'password' => 'Isaac$123',
            ],
            [
                'name' => 'Super Administrator',
                'email' => 'admin2@gmail.com',
                'phone' => '0537099455',
                'password' => 'Admin$123',
            ],
        ];

        // 3. Inject Accounts Without Overwriting If Modified
        foreach ($admins as $adminData) {
            User::firstOrCreate(
                ['email' => $adminData['email']],
                [
                    'name' => $adminData['name'],
                    'phone' => $adminData['phone'],
                    'password' => Hash::make($adminData['password']),
                    'role_id' => $adminRole->id,
                    'status' => UserStatus::Active?->value ?? 'ACTIVE',
                    'must_change_password' => false,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
