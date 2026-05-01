<?php

namespace App\Http\Controllers\Api\Mobile\Sync;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Mobile\Sync\SyncPullRequest;
use App\Http\Requests\Api\Mobile\Sync\SyncPushRequest;
use App\Services\Sync\SyncService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class SyncController extends Controller
{
    public function __construct(
        private readonly SyncService $syncService
    ) {
    }

    public function push(SyncPushRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $result = $this->syncService->push(
            deviceId: (string) $validated['device_id'],
            changes: $validated['changes'],
            userId: (int) $request->user()->id,
        );
        $message = (string) $result['message'];
        unset($result['message']);

        return ApiResponse::success(
            message: $message,
            data: $result,
        );
    }

    public function pull(SyncPullRequest $request): JsonResponse
    {
        $data = $this->syncService->pull(
            updatedSince: (string) $request->validated('updated_since')
        );

        return ApiResponse::success(
            message: 'Sinkronisasi pull berhasil',
            data: $data,
        );
    }
}

