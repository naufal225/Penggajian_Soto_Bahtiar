<?php

namespace App\Exceptions;

use RuntimeException;

class DailyWageLockedException extends RuntimeException
{
    /**
     * @param  array<string, mixed>|null  $details
     */
    public function __construct(
        public readonly ?array $details = null
    ) {
        parent::__construct('Daily wage record is locked.');
    }
}

