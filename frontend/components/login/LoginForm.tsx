import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loginStyles } from '@/screens/login/LoginScreen.styles';

interface LoginFormProps {
  email: string;
  password: string;
  isLoading: boolean;
  errorMessage?: string;
  emailError?: string;
  passwordError?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export default function LoginForm({
  email,
  password,
  isLoading,
  errorMessage,
  emailError,
  passwordError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={loginStyles.container}>
        <View style={loginStyles.card}>
          <View style={loginStyles.brandRow}>
            <View style={loginStyles.brandIcon}>
              <Text style={loginStyles.brandIconText}>SB</Text>
            </View>
            <Text style={loginStyles.brandText}>SOTO BAHTIAR</Text>
          </View>

          <Text style={loginStyles.title}>Masuk</Text>

          <View>
            <Text style={loginStyles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Contoh: nama@email.com"
              placeholderTextColor="#6B7280"
              style={loginStyles.input}
              value={email}
              onChangeText={onEmailChange}
            />
            {emailError ? <Text style={loginStyles.errorText}>{emailError}</Text> : null}
          </View>

          <View>
            <Text style={loginStyles.label}>Kata Sandi</Text>
            <TextInput
              autoCapitalize="none"
              secureTextEntry
              placeholder="Masukkan kata sandi"
              placeholderTextColor="#6B7280"
              style={loginStyles.input}
              value={password}
              onChangeText={onPasswordChange}
            />
            {passwordError ? <Text style={loginStyles.errorText}>{passwordError}</Text> : null}
          </View>

          {errorMessage ? <Text style={loginStyles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onSubmit}
            style={({ pressed }) => [
              loginStyles.submitButton,
              isLoading ? loginStyles.submitButtonDisabled : null,
              pressed ? { opacity: 0.88 } : null,
            ]}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={loginStyles.submitText}>Masuk</Text>
            )}
          </Pressable>

          <Text style={loginStyles.footerText}>SISTEM PENGGAJIAN TERINTEGRASI</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
