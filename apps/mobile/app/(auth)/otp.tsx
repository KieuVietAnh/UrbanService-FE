import { View, Text, StyleSheet } from 'react-native';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useState } from 'react';

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
      setError('Please enter a 6-digit code');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>
      {error && (
        <Text style={{ ...styles.error, color: '#EF4444', marginBottom: 16 }}>
          {error}
        </Text>
      )}
      <AppInput
        label="OTP"
        placeholder="123456"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />
      <AppButton onPress={handleVerify}>Verify</AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
  },
});