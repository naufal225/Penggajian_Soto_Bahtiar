<?php

namespace App\Enums;

enum WeekStatus: string
{
    case Open = 'open';
    case PartialPaid = 'partial_paid';
    case FullyPaid = 'fully_paid';
}

