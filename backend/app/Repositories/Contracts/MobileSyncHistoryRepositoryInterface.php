<?php

namespace App\Repositories\Contracts;

use App\Models\MobileSyncHistory;

interface MobileSyncHistoryRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(array $payload): MobileSyncHistory;
}

