<?php

namespace App\Models;

use App\Enums\DayOfWeek;
use App\Enums\DeliveryMode;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Timetable extends Model
{
    protected $fillable = [
        'course_id',
        'teacher_id',
        'day_of_week',
        'start_time',
        'end_time',
        'classroom',
        'delivery_mode',
        'meeting_link',
        'meeting_opens_minutes_before',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => DayOfWeek::class,
            'delivery_mode' => DeliveryMode::class,
            'meeting_opens_minutes_before' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attendance(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function meetingIsOpenAt(CarbonInterface $moment): bool
    {
        if (! $this->meeting_link) {
            return false;
        }

        $momentDay = DayOfWeek::tryFrom(strtoupper($moment->format('l')));

        if ($momentDay !== $this->day_of_week) {
            return false;
        }

        $opens = $this->sessionStartOnDate($moment->toDateString())
            ->subMinutes($this->meeting_opens_minutes_before);
        $closes = $this->sessionEndOnDate($moment->toDateString());

        return $moment->betweenIncluded($opens, $closes);
    }

    public function sessionStartOnDate(string $date): CarbonInterface
    {
        return \Illuminate\Support\Carbon::parse($date.' '.$this->start_time);
    }

    public function sessionEndOnDate(string $date): CarbonInterface
    {
        return \Illuminate\Support\Carbon::parse($date.' '.$this->end_time);
    }
}
