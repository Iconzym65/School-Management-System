<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $cached = Cache::remember("settings.{$key}", 60, function () use ($key) {
            return static::query()->where('key', $key)->value('value');
        });

        return $cached ?? $default;
    }

    public static function setValue(string $key, mixed $value): self
    {
        $setting = static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => is_scalar($value) || $value === null ? (string) $value : json_encode($value)],
        );

        Cache::forget("settings.{$key}");

        return $setting;
    }
}
