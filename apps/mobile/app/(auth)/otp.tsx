import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { OTPInput } from '@/components/ui/OTPInput';
import { useAuthStore } from '@/features/auth/auth.store';
import { useToast } from '@/components/ui/Toast';
import { semantics } from '@/theme/semantics';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const logout = useAuthStore((s) => s.logout);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [otp, setOtp] = useState('');
  const [hasError, setHasError] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 6) {
      setHasError(true);
      toast.error('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }
    setHasError(false);
    try {
      await verifyOtp(otp);
      toast.success('Xác thực Email thành công!');
      router.replace('/(resident)');
    } catch (error: unknown) {
      setHasError(true);
      const message = error instanceof Error ? error.message : 'Mã OTP không chính xác hoặc đã hết hạn';
      toast.error(message);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await sendOtp();
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setOtp('');
      setHasError(false);
      toast.success('Đã gửi lại mã OTP đến Email của bạn');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
      toast.error(message);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const userEmail = user?.email || 'Email của bạn';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={handleSwitchAccount} style={styles.backBtn} hitSlop={10}>
            <Icon name="arrow-left" size={20} color={semantics.text.brand} />
          </Pressable>
          <Text style={styles.headerTitle}>Xác thực Email</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.illustrationWrap}>
          <View style={styles.iconCircle}>
            <Icon name="mail" size={42} color={semantics.text.brand} />
          </View>
          <View style={styles.badgeCheck}>
            <Icon name="check" size={14} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.title}>Kiểm tra hòm thư Email</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác thực OTP 6 chữ số đến địa chỉ:{'\n'}
            <Text style={styles.emailText}>{userEmail}</Text>
          </Text>
        </View>

        <View style={styles.otpWrap}>
          <OTPInput length={6} value={otp} onChange={setOtp} error={hasError} />
        </View>

        <Pressable
          onPress={handleResend}
          disabled={countdown > 0}
          style={styles.resendBtn}
          hitSlop={8}
        >
          <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
            {countdown > 0
              ? `Gửi lại mã OTP sau ${countdown}s`
              : 'Chưa nhận được mã? Gửi lại OTP'}
          </Text>
        </Pressable>

        <AppButton
          onPress={handleVerify}
          loading={isLoading}
          fullWidth
          size="lg"
          disabled={otp.length < 6}
        >
          Xác nhận
        </AppButton>

        <Pressable onPress={handleSwitchAccount} style={styles.switchBtn} hitSlop={10}>
          <Text style={styles.switchText}>Đăng nhập tài khoản khác</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: semantics.bg.app,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantics.bg.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Geist-Bold',
    color: semantics.text.primary,
  },
  illustrationWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: semantics.bg.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: semantics.bg.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheck: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: semantics.intent.success.dot,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: semantics.bg.surface,
  },
  infoCard: {
    width: '100%',
    backgroundColor: semantics.bg.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: semantics.border.default,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Geist-Bold',
    color: semantics.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: semantics.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.primary,
  },
  otpWrap: {
    width: '100%',
    marginBottom: 20,
  },
  resendBtn: {
    marginBottom: 28,
    paddingVertical: 4,
  },
  resendText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: semantics.text.brand,
  },
  resendDisabled: {
    color: semantics.text.lightMuted,
  },
  switchBtn: {
    marginTop: 20,
    paddingVertical: 8,
  },
  switchText: {
    fontFamily: 'Geist-Medium',
    fontSize: 14,
    color: semantics.text.muted,
  },
});