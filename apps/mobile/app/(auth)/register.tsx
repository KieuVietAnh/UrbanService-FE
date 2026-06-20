import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { useState } from 'react';
import { colors } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    try {
      // Mock registration (just login for now)
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    }
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>UrbanMind</Text>
        </View>

        <Text style={styles.title}>Đăng ký</Text>
        <Text style={styles.subtitle}>
          Tạo tài khoản mới để bắt đầu sử dụng ứng dụng
        </Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        <AppInput
          label="Họ và tên"
          placeholder="Nhập họ và tên"
          value={name}
          onChangeText={setName}
        />
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
          onPress={handleRegister}
          style={styles.primaryButton}
        >
          Đăng ký
        </AppButton>

        <View style={styles.bottomLinks}>
          <Text style={styles.bottomText}>
            Đã có tài khoản?
          </Text>
          <View style={styles.signinLink}>
            <Text style={styles.linkText} onPress={() => router.push('/(auth)/login')}>
              Đăng nhập ngay
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
  signinLink: {
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});