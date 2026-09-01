<?php

namespace Database\Seeders;

use App\Enums\RoleSlug;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $role = Role::query()->firstOrCreate(
            ['slug' => RoleSlug::Admin->value],
            ['name' => 'Administrator'],
        );

        User::factory()->create([
            'role_id' => $role->id,
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
