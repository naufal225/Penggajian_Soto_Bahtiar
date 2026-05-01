<?php

namespace App\DTOs\Sync;

class SyncPushResultDTO
{
    /**
     * @param  array<string, mixed>|null  $error
     */
    public function __construct(
        public readonly string $status,
        public readonly string $entity,
        public readonly string $action,
        public readonly ?string $clientUuid = null,
        public readonly ?int $serverId = null,
        public readonly ?array $error = null,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'client_uuid' => $this->clientUuid,
            'server_id' => $this->serverId,
            'status' => $this->status,
            'entity' => $this->entity,
            'action' => $this->action,
            'error' => $this->error,
        ];
    }
}

