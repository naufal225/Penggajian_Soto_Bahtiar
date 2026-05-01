<?php

namespace App\Enums;

enum PaymentScope: string
{
    case Employee = 'employee';
    case All = 'all';
}

