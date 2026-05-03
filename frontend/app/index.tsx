import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getAuthToken } from '@/services/storage/session-storage';

export default function AppEntryScreen() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const token = await getAuthToken();

      if (!isMounted) {
        return;
      }

      if (token) {
        router.replace('/(tabs)');
        return;
      }

      router.replace('/login');
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>Memeriksa sesi...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    fontSize: 16,
    color: '#374151',
  },
});
