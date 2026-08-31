<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assignment extends Model
{
    protected $fillable = [
        'teacher_id',
        'course_id',
        'title',
        'instructions',
        'attachment_path',
        'max_score',
        'due_at',
        'is_published',
        'allow_late',
    ];

    protected function casts(): array
    {
        return [
            'max_score' => 'decimal:2',
            'due_at' => 'datetime',
            'is_published' => 'boolean',
            'allow_late' => 'boolean',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }
}
