import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { useState } from 'react';
import { colors } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email, password);
      // After login, redirect to root and let index.tsx handle role-based routing
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>UrbanMind</Text>
        </View>

        <Text style={styles.title}>Đăng nhập</Text>
        <Text style={styles.subtitle}>
          Nhập thông tin để truy cập tài khoản của bạn
        </Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        <AppInput
          label="Địa chỉ email"
          placeholder="example@domain.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppInput
          label="Mật khẩu"
          placeholder="••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <AppButton
          variant="primary"
          onPress={handleLogin}
          style={styles.primaryButton}
        >
          Đăng nhập
        </AppButton>

        <View style={styles.bottomLinks}>
          <Text style={styles.bottomText}>
            Bạn chưa có tài khoản?
          </Text>
          <View style={styles.signupLink}>
            <Text style={styles.linkText} onPress={() => router.push('/(auth)/register')}>
              Đăng ký ngay
            </Text>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: colors.red,
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: {
    marginVertical: 20,
  },
  bottomLinks: {
    marginTop: 24,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  signupLink: {
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});