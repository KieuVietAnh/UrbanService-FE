import { View, Text, StyleSheet } from 'react-native';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { useState } from 'react';

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
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      {error && (
        <Text style={{ ...styles.error, color: '#EF4444', marginBottom: 16 }}>
          {error}
        </Text>
      )}
      <AppInput
        label="Name"
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />
      <AppInput
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <AppInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <AppButton onPress={handleRegister}>Register</AppButton>
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
    marginBottom: 32,
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
  },
});