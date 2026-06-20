import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { colors } from '@/constants/theme';

export default function OTPScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = () => {
    setError(null);
    if (otp.length === 6) {
      // Mock OTP verification successful
      router.replace('/');
    } else {
      setError('Vui lòng nhập mã 6 chữ số');
    }
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>UrbanMind</Text>
        </View>

        <Text style={styles.title}>Xác thực OTP</Text>
        <Text style={styles.subtitle}>
          Nhập mã 6 chữ số đã được gửi tới email của bạn
        </Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        <AppInput
          label="Mã OTP"
          placeholder="Nhập mã OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
        />
        <AppButton
          variant="primary"
          onPress={handleVerify}
          style={styles.primaryButton}
        >
          Xác thực
        </AppButton>
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
});