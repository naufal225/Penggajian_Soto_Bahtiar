<?php

namespace App\Repositories\Eloquent;

use App\Models\MobileSyncHistory;
use App\Repositories\Contracts\MobileSyncHistoryRepositoryInterface;

class MobileSyncHistoryRepository implements MobileSyncHistoryRepositoryInterface
{
    public function create(array $payload): MobileSyncHistory
    {
        return MobileSyncHistory::query()->create($payload);
    }
}

