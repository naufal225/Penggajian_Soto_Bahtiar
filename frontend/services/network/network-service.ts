import * as Network from 'expo-network';

export interface MobileNetworkSnapshot {
  isConnected: boolean;
  isInternetReachable: boolean;
}

function normalizeState(state: Network.NetworkState): MobileNetworkSnapshot {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? state.isConnected ?? false,
  };
}

export function isNetworkAvailable(snapshot: MobileNetworkSnapshot): boolean {
  return snapshot.isConnected && snapshot.isInternetReachable;
}

export async function getNetworkSnapshot(): Promise<MobileNetworkSnapshot> {
  const state = await Network.getNetworkStateAsync();
  return normalizeState(state);
}

export function subscribeToNetworkChanges(
  listener: (snapshot: MobileNetworkSnapshot) => void
): { remove: () => void } {
  return Network.addNetworkStateListener((state) => {
    listener(normalizeState(state));
  });
}
