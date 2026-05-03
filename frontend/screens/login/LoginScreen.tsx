import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';

import LoginForm from '@/components/login/LoginForm';
import { loginStyles } from '@/screens/login/LoginScreen.styles';
import { getAuthToken } from '@/services/storage/session-storage';
import { useLoginViewModel } from '@/viewmodels/useLoginViewModel';

export default function LoginScreen() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const loginViewModel = useLoginViewModel(() => {
    router.replace('/(tabs)');
  });

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const token = await getAuthToken();

      if (!isMounted) {
        return;
      }

      if (token) {
        router.replace('/(tabs)');
        return;
      }

      setIsCheckingSession(false);
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <SafeAreaView style={loginStyles.safeArea}>
        <View style={loginStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={loginStyles.loadingText}>Memuat halaman masuk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={loginStyles.safeArea}>
      <LoginForm
        email={loginViewModel.email}
        password={loginViewModel.password}
        isLoading={loginViewModel.status === 'loading'}
        errorMessage={loginViewModel.errors.general}
        emailError={loginViewModel.errors.email}
        passwordError={loginViewModel.errors.password}
        onEmailChange={loginViewModel.setEmail}
        onPasswordChange={loginViewModel.setPassword}
        onSubmit={loginViewModel.submitLogin}
      />
    </SafeAreaView>
  );
}
