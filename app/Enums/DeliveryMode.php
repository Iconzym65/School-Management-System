<?php

namespace App\Enums;

enum DeliveryMode: string
{
    case Classroom = 'CLASSROOM';
    case Virtual = 'VIRTUAL';
    case Hybrid = 'HYBRID';
}
