<?php

namespace App\Enums;

enum SyncResultStatus: string
{
    case Success = 'success';
    case Failed = 'failed';
    case Conflict = 'conflict';
}

