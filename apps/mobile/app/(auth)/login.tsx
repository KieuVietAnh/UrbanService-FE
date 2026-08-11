import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useAuthStore } from '@/features/auth/auth.store';
import { useToast } from '@/components/ui/Toast';
import { semantics } from '@/theme/semantics';

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const submitLockRef = useRef(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) {
      e.email = 'Vui lòng nhập email hoặc số điện thoại';
    }
    if (!password) {
      e.password = 'Vui lòng nhập mật khẩu';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (submitLockRef.current || isLoading) return;
    if (!validate()) return;

    submitLockRef.current = true;
    try {
      const user = await login(email.trim(), password);
      if (user.isVerified === false) {
        router.replace('/(auth)/verify-email');
      } else {
        router.replace('/(resident)');
      }
    } catch (err: any) {
      toast.error(err.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={styles.flex1}>
          <ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
          >
          {/* Hero Panel — Aligned with Web Auth Layout */}
          <View style={styles.heroPanel}>
            <View style={styles.heroGlow} />
            <View style={styles.brandHeaderRow}>
              <View style={styles.brandIconSquare}>
                <Icon name="map-pin" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>UrbanMind</Text>
                <Text style={styles.brandTagline}>Cổng phản ánh đô thị thông minh</Text>
              </View>
            </View>

            <Text style={styles.brandSubtitle}>
              Theo dõi phản ánh, nhận thông báo tiến độ và tương tác với chính quyền dễ dàng.
            </Text>

            {/* Step Pills — Aligned with Web AuthProductionRoute */}
            <View style={styles.stepRow}>
              <View style={styles.stepPill}>
                <View style={[styles.stepNumBadge, { backgroundColor: semantics.bg.primary }]}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <Text style={styles.stepLabelText}>Ghi nhận</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepPill}>
                <View style={[styles.stepNumBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <Text style={styles.stepLabelText}>Theo dõi</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.stepPill}>
                <View style={[styles.stepNumBadge, { backgroundColor: 'rgba(16,185,129,0.3)' }]}>
                  <Text style={[styles.stepNumText, { color: '#6EE7B7' }]}>3</Text>
                </View>
                <Text style={styles.stepLabelText}>Hoàn tất</Text>
              </View>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSub}>
              Nhập thông tin tài khoản để tiếp tục theo dõi phản ánh của bạn
            </Text>

            <AppInput
              label="Email hoặc Số điện thoại"
              leftIcon="mail"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (authError) clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <PasswordInput
              label="Mật khẩu"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (authError) clearError();
              }}
              error={errors.password}
            />

            {authError ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color={semantics.feedback.error.icon} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            <AppButton
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              className="mt-2"
              rightIcon={<Icon name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />}
            >
              Đăng nhập
            </AppButton>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            <AppButton
              variant="outline"
              fullWidth
              size="lg"
              onPress={() => router.push('/(auth)/register')}
            >
              Tạo tài khoản mới
            </AppButton>
          </View>

          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>
              Bằng cách đăng nhập, bạn đồng ý với{' '}
              <Text style={styles.footerLink}>Điều khoản sử dụng</Text>
              {' '}và{' '}
              <Text style={styles.footerLink}>Chính sách bảo mật</Text>
              {' '}của UrbanMind.
            </Text>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantics.bg.app,
  },
  flex1: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 56,
  },
  heroPanel: {
    backgroundColor: '#071024',
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  brandIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: semantics.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: semantics.bg.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 22,
    fontFamily: 'Geist-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 11,
    fontFamily: 'Geist-Medium',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 19,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontFamily: 'Geist-Bold',
    color: '#FFFFFF',
  },
  stepLabelText: {
    fontSize: 11,
    fontFamily: 'Geist-Medium',
    color: 'rgba(255, 255, 255, 0.88)',
  },
  stepDivider: {
    width: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  card: {
    backgroundColor: semantics.bg.surface,
    borderRadius: 26,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: semantics.border.default,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Geist-Bold',
    color: semantics.text.primary,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: semantics.text.muted,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: semantics.feedback.error.bg,
    borderWidth: 1,
    borderColor: semantics.feedback.error.border,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Geist-Medium',
    color: semantics.feedback.error.text,
    lineHeight: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: semantics.border.light,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Geist-Medium',
    color: semantics.text.lightMuted,
    paddingHorizontal: 12,
  },
  footerWrap: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: semantics.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.brand,
  },
});