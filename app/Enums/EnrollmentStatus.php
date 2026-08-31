<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Enrolled = 'ENROLLED';
    case Dropped = 'DROPPED';
    case Completed = 'COMPLETED';
}
