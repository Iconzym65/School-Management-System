<?php

namespace App\Enums;

enum RoleSlug: string
{
    case Admin = 'admin';
    case Teacher = 'teacher';
    case Student = 'student';
}
