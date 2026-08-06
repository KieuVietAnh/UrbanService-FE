import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
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

interface Errors {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const toast = useToast();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const set = (field: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [field]: v }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên';
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^0\d{9}$/.test(form.phone)) e.phone = 'Số điện thoại không hợp lệ';
    if (!form.email.trim()) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    if (!agreed) {
      toast.error('Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }
    try {
      await register({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      // Navigate to OTP
      router.push({ pathname: '/(auth)/otp', params: { phone: form.phone } });
    } catch {
      toast.error('Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.primary} />
          </Pressable>

          <View className="items-center mb-7 mt-2">
            <View style={styles.logoWrap}>
              <Icon name="grid" size={22} color="#FFFFFF" />
            </View>
            <Text className="text-xl font-sans-bold text-primary mt-3">UrbanMind</Text>
          </View>

          <View style={styles.card}>
            <Text className="text-2xl font-sans-bold text-text text-center mb-1" style={{ letterSpacing: -0.4 }}>
              Tạo tài khoản
            </Text>
            <Text className="text-sm text-text-muted text-center mb-6">
              Đăng ký để gửi phản ánh và theo dõi tiến độ xử lý
            </Text>

            <AppInput label="Họ và tên" leftIcon="user" value={form.fullName} onChangeText={set('fullName')} autoCapitalize="words" error={errors.fullName} />
            <AppInput label="Số điện thoại" leftIcon="phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
            <AppInput label="Email" leftIcon="mail" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            <AppInput label="Mật khẩu" leftIcon="lock" value={form.password} onChangeText={set('password')} isPassword error={errors.password} />
            <AppInput label="Nhập lại mật khẩu" leftIcon="lock" value={form.confirmPassword} onChangeText={set('confirmPassword')} isPassword error={errors.confirmPassword} />

            {/* Terms */}
            <Pressable
              onPress={() => setAgreed((v) => !v)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Icon name="check" size={12} color="#FFFFFF" />}
              </View>
              <Text className="text-sm text-text flex-1 leading-snug">
                Tôi đồng ý với{' '}
                <Text className="text-primary font-sans-semibold">điều khoản sử dụng</Text>
                {' '}của UrbanMind
              </Text>
            </Pressable>

            <AppButton onPress={handleRegister} loading={isLoading} fullWidth size="lg" className="mt-4">
              Đăng ký
            </AppButton>

            <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-4 self-center">
              <Text className="text-sm text-text-muted">
                Đã có tài khoản?{' '}
                <Text className="text-primary font-sans-semibold">Đăng nhập</Text>
              </Text>
            </Pressable>
          </View>

          {/* Bottom promo */}
          <View style={styles.promoBanner}>
            <Text className="text-xs font-sans-semibold text-primary uppercase tracking-wider mb-1">
              CÙNG NHAU XÂY DỰNG
            </Text>
            <Text className="text-sm text-text-muted text-center">
              Mỗi phản ánh của bạn góp phần làm thành phố văn minh hơn.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  promoBanner: { backgroundColor: '#EFF6FF', borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center' },
});