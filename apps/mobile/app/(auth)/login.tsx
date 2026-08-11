import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useAuthStore } from '@/features/auth/auth.store';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ';
    if (!password) e.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim(), password);
      router.replace('/(resident)');
    } catch {
      toast.error('Email hoặc mật khẩu không chính xác');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.primary} />
          </Pressable>

          {/* Brand */}
          <View className="items-center mb-8 mt-2">
            <View style={styles.logoWrap}>
              <Icon name="grid" size={22} color="#FFFFFF" />
            </View>
            <Text className="text-xl font-sans-bold text-primary mt-3">UrbanMind</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text className="text-2xl font-sans-bold text-text text-center mb-1" style={{ letterSpacing: -0.4 }}>
              Đăng nhập
            </Text>
            <Text className="text-sm text-text-muted text-center mb-7">
              Tiếp tục theo dõi phản ánh và cập nhật khu vực của bạn
            </Text>

            <AppInput
              label="Email"
              leftIcon="mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <AppInput
              label="Mật khẩu"
              leftIcon="lock"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
            />

            <Pressable className="self-end mb-6 -mt-2">
              <Text className="text-sm font-sans-semibold text-primary">Quên mật khẩu?</Text>
            </Pressable>

            <AppButton
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              rightIcon={<Icon name="log-in" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />}
            >
              Đăng nhập
            </AppButton>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text className="text-xs text-text-light px-3">HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            <AppButton
              variant="outline"
              fullWidth
              size="lg"
              onPress={() => router.push('/(auth)/register')}
            >
              Đăng ký tài khoản mới
            </AppButton>
          </View>

          {/* City decoration */}
          <View style={styles.cityWrap}>
            <View style={styles.cityGradient} />
            <Text className="text-xs text-text-muted text-center mt-2 px-4">
              Bằng cách đăng nhập, bạn đồng ý với{' '}
              <Text className="text-primary font-sans-semibold">Điều khoản sử dụng</Text>
              {' '}và{' '}
              <Text className="text-primary font-sans-semibold">Chính sách bảo mật</Text>
              {' '}của UrbanMind.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  cityWrap: {
    marginTop: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    height: 120,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  cityGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8F0FE',
    opacity: 0.6,
  },
});