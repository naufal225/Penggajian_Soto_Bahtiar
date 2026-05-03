import { AppState } from 'react-native';
import { useEffect } from 'react';

import { subscribeToNetworkChanges } from '@/services/network/network-service';
import { syncPendingChanges } from '@/services/sync/mobile-sync-service';

export function useMobileSyncBootstrap() {
  useEffect(() => {
    let wasOnline = false;
    const runBackgroundSync = (reason: string) => {
      void syncPendingChanges(reason).catch(() => {
        // background sync tidak boleh memunculkan red screen
      });
    };

    const networkSubscription = subscribeToNetworkChanges((snapshot) => {
      const isOnline = snapshot.isConnected && snapshot.isInternetReachable;
      if (isOnline && !wasOnline) {
        runBackgroundSync('network_reconnected');
      }

      wasOnline = isOnline;
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        runBackgroundSync('app_active');
      }
    });

    runBackgroundSync('app_bootstrap');

    return () => {
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);
}
