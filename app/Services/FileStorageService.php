<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class FileStorageService
{
    public function storeAssignmentFile(UploadedFile $file, string $directory): string
    {
        $safeName = Str::uuid().'.'.$file->getClientOriginalExtension();

        return $file->storeAs($directory, $safeName, 'assignments');
    }
}
